%% Grader-internal test harness. Learner code cannot reach this module: static checks reject
%% `@external` and imports of `fp_internal/*`.
%%
%% Protocol (see modules/grading/src/runner/protocol.ts):
%%   input : .fp/nonce (random marker) and .fp/job.json, both deleted before any learner code runs
%%           job = {"tests": ["<module>.<fn>", ...], "timeMs": N, "memoryMb": N,
%%                  "perf": null | {"module": "<module>", "sizes": [N, ...]}}
%%   output: one line per event on stdout: "@@FP:<nonce>@@" ++ JSON (ASCII only).
%%           events: hello, test, perf, perf_skipped, harness_error, done.
%%           A test event is {"type":"test","name","status","durationMs"} plus, when it did not pass,
%%           "failure": {"kind": ..., language-neutral fields} (see src/grading/failure.ts, which renders the
%%           text per locale) and "output"/"outputTruncated" (captured learner stdout). The harness never
%%           emits human-readable sentences: no natural-language text lives here.
%%
%% Every test (and every perf size) runs in a fresh process with max_heap_size (memoryMb) and a
%% timeout. timeMs is the budget for the whole test phase; each perf size gets its own timeMs.
%% The process group leader is replaced so learner stdout is captured (and attached to failure
%% messages) instead of reaching the real stdout.
-module(fp_internal_harness_ffi).
-export([main/0]).

-define(MAX_MESSAGE, 3000).
-define(MAX_CAPTURE, 1500).

main() ->
    Code =
        try run() of
            ok -> 0
        catch
            Class:Reason:Stack ->
                safe_emit(#{type => harness_error,
                            message => fmt("~p:~0P ~0P", [Class, Reason, 20, Stack, 20])}),
                3
        end,
    init:stop(Code),
    nil.

run() ->
    {ok, NonceRaw} = file:read_file(".fp/nonce"),
    {ok, JobBin} = file:read_file(".fp/job.json"),
    ok = file:del_dir_r(".fp"),
    Nonce = string:trim(NonceRaw),
    persistent_term:put({?MODULE, marker}, <<"@@FP:", Nonce/binary, "@@">>),
    Job = json:decode(JobBin),
    #{<<"tests">> := Tests, <<"timeMs">> := TimeMs, <<"memoryMb">> := MemoryMb} = Job,
    Heap = MemoryMb * 1024 * 1024 div erlang:system_info(wordsize),
    Limits = #{time_ms => TimeMs, memory_mb => MemoryMb, heap => Heap},
    emit(#{type => hello, otp => list_to_binary(erlang:system_info(otp_release))}),
    AllPassed = run_tests(Tests, now_ms() + TimeMs, Limits, true),
    case maps:get(<<"perf">>, Job, null) of
        null -> ok;
        #{<<"module">> := PerfModule, <<"sizes">> := Sizes} when AllPassed ->
            run_perf(PerfModule, Sizes, Limits);
        _ ->
            emit(#{type => perf_skipped})
    end,
    emit(#{type => done}),
    ok.

%% ---------------------------------------------------------------- tests

run_tests([], _Deadline, _Limits, AllPassed) ->
    AllPassed;
run_tests([Name | Rest], Deadline, Limits, AllPassed) ->
    Remaining = Deadline - now_ms(),
    Status =
        case Remaining > 0 of
            true ->
                run_test(Name, Remaining, Limits);
            false ->
                emit_test(Name, timeout, #{kind => budget_exhausted, limitMs => maps:get(time_ms, Limits)},
                          {<<>>, false}, 0),
                timeout
        end,
    run_tests(Rest, Deadline, Limits, AllPassed andalso Status =:= passed).

run_test(Name, Timeout, Limits) ->
    case resolve(Name) of
        {error, Failure} ->
            emit_test(Name, error, Failure, {<<>>, false}, 0),
            error;
        {ok, Module, Function, ModuleName} ->
            Started = now_ms(),
            {Outcome, Output} =
                isolated(fun() ->
                             try Module:Function() of
                                 _ -> passed
                             catch
                                 Class:Reason:Stack -> describe(Class, Reason, Stack, ModuleName)
                             end
                         end, Timeout, maps:get(heap, Limits)),
            Duration = now_ms() - Started,
            {Status, Failure} =
                case Outcome of
                    {ok, passed} -> {passed, undefined};
                    {ok, {Kind, F}} -> {Kind, F};
                    timeout -> {timeout, #{kind => timeout, limitMs => maps:get(time_ms, Limits)}};
                    killed -> {error, #{kind => memory, limitMb => maps:get(memory_mb, Limits)}};
                    {crashed, Reason} -> {error, #{kind => crashed, reason => text(fmt("~0P", [Reason, 20]))}}
                end,
            emit_test(Name, Status, Failure, Output, Duration),
            Status
    end.

%% Output = {CapturedBytes, Truncated}; it is attached only to tests that did not pass.
emit_test(Name, Status, Failure, {Output, Truncated}, Duration) ->
    Base = #{type => test, name => Name, status => Status, durationMs => Duration},
    WithFailure = case Failure of
                      undefined -> Base;
                      _ -> Base#{failure => Failure}
                  end,
    emit(case Status =/= passed andalso Output =/= <<>> of
             true -> WithFailure#{output => Output, outputTruncated => Truncated};
             false -> WithFailure
         end).

resolve(Name) ->
    case string:split(Name, ".", trailing) of
        [ModuleName, FunctionName] when ModuleName =/= <<>>, FunctionName =/= <<>> ->
            case load(ModuleName) of
                {ok, Module} ->
                    Function = binary_to_atom(FunctionName, utf8),
                    case erlang:function_exported(Module, Function, 0) of
                        true -> {ok, Module, Function, ModuleName};
                        false -> {error, #{kind => test_not_found, name => Name}}
                    end;
                error ->
                    {error, #{kind => module_not_found, module => ModuleName}}
            end;
        _ ->
            {error, #{kind => bad_test_name, name => text(Name)}}
    end.

load(ModuleName) ->
    Module = binary_to_atom(binary:replace(ModuleName, <<"/">>, <<"@">>, [global]), utf8),
    case code:ensure_loaded(Module) of
        {module, Module} -> {ok, Module};
        _ -> error
    end.

%% ---------------------------------------------------------------- performance

run_perf(ModuleName, Sizes, Limits) ->
    case load(ModuleName) of
        error ->
            [emit(#{type => perf, size => S, cost => 0, status => error}) || S <- Sizes],
            ok;
        {ok, Module} ->
            perf_sizes(Module, Sizes, Limits)
    end.

perf_sizes(_Module, [], _Limits) ->
    ok;
perf_sizes(Module, [Size | Rest], Limits) ->
    {Outcome, _Output} =
        isolated(fun() ->
                     Input = Module:setup(Size),
                     {reductions, Before} = erlang:process_info(self(), reductions),
                     _ = Module:run(Input),
                     {reductions, After} = erlang:process_info(self(), reductions),
                     After - Before
                 end, maps:get(time_ms, Limits), maps:get(heap, Limits)),
    case Outcome of
        {ok, Cost} when is_integer(Cost) ->
            emit(#{type => perf, size => Size, cost => Cost, status => ok}),
            perf_sizes(Module, Rest, Limits);
        timeout ->
            %% Larger inputs cannot be faster; do not burn more time on them.
            [emit(#{type => perf, size => S, cost => 0, status => timeout}) || S <- [Size | Rest]],
            ok;
        _ ->
            emit(#{type => perf, size => Size, cost => 0, status => error}),
            perf_sizes(Module, Rest, Limits)
    end.

%% ---------------------------------------------------------------- isolation

%% Runs Fun in a fresh process with a heap limit and a timeout. Exceptions must be caught by Fun.
isolated(Fun, Timeout, HeapWords) ->
    Parent = self(),
    Ref = make_ref(),
    Capture = spawn(fun() -> capture_loop(<<>>, false) end),
    {Pid, MRef} =
        spawn_opt(fun() ->
                      group_leader(Capture, self()),
                      Parent ! {Ref, Fun()}
                  end,
                  [monitor,
                   {max_heap_size, #{size => HeapWords, kill => true, error_logger => false,
                                     include_shared_binaries => true}}]),
    Outcome =
        receive
            {Ref, Result} ->
                erlang:demonitor(MRef, [flush]),
                {ok, Result};
            {'DOWN', MRef, process, Pid, killed} ->
                killed;
            {'DOWN', MRef, process, Pid, Reason} ->
                {crashed, Reason}
        after Timeout ->
            exit(Pid, kill),
            receive {'DOWN', MRef, process, Pid, _} -> ok end,
            timeout
        end,
    Capture ! {get, self()},
    Output = receive {captured, Capture, Captured} -> Captured after 1000 -> {<<>>, false} end,
    exit(Capture, kill),
    {Outcome, Output}.

%% Minimal io server that keeps the first ?MAX_CAPTURE bytes written by the test process.
capture_loop(Buf, Truncated) ->
    receive
        {io_request, From, ReplyAs, Request} ->
            {Reply, Buf2, Truncated2} = io_request(Request, Buf, Truncated),
            From ! {io_reply, ReplyAs, Reply},
            capture_loop(Buf2, Truncated2);
        {get, From} ->
            From ! {captured, self(), {Buf, Truncated}};
        _ ->
            capture_loop(Buf, Truncated)
    end.

io_request({put_chars, Encoding, Chars}, Buf, Truncated) ->
    case unicode:characters_to_binary(Chars, Encoding, unicode) of
        Bin when is_binary(Bin) -> append(Bin, Buf, Truncated);
        _ -> {{error, badarg}, Buf, Truncated}
    end;
io_request({put_chars, Chars}, Buf, Truncated) ->
    io_request({put_chars, latin1, Chars}, Buf, Truncated);
io_request({requests, Requests}, Buf, Truncated) ->
    lists:foldl(fun(R, {_, B, T}) -> io_request(R, B, T) end, {ok, Buf, Truncated}, Requests);
io_request(getopts, Buf, Truncated) ->
    {[{binary, true}, {encoding, unicode}], Buf, Truncated};
io_request({setopts, _}, Buf, Truncated) ->
    {ok, Buf, Truncated};
io_request(_, Buf, Truncated) ->
    {{error, enotsup}, Buf, Truncated}.

append(_Bin, Buf, true) ->
    {ok, Buf, true};
append(Bin, Buf, false) ->
    Room = ?MAX_CAPTURE - byte_size(Buf),
    case byte_size(Bin) =< Room of
        true -> {ok, <<Buf/binary, Bin/binary>>, false};
        false -> {ok, <<Buf/binary, (truncate(Bin, Room))/binary>>, true}
    end.

%% ---------------------------------------------------------------- failures

%% Returns {failed | error, Failure}. "failed" = an assertion in the test code (gleeunit/should,
%% `assert`, `let assert`/`panic` in the test module, qcheck); "error" = anything else (a crash,
%% `todo` or `panic` in learner code, ...). Failure is a map of language-neutral fields.
describe(error, #{gleam_error := Kind} = E, Stack, TestModule) ->
    Module = maps:get(module, E, <<>>),
    Assertion = Module =:= TestModule orelse Module =:= <<"gleeunit/should">>
        orelse Module =:= <<"qcheck">> orelse string:prefix(Module, <<"qcheck/">>) =/= nomatch,
    Location = case Module of
                   %% should.equal panics inside gleeunit: point at the calling test line when the frame
                   %% survived (tail calls drop it); a location inside gleeunit is useless.
                   <<"gleeunit/should">> -> caller_location(Stack, TestModule);
                   _ -> location(E)
               end,
    Message = maps:get(message, E, <<>>),
    {Status, Failure} =
        case Kind of
            assert ->
                {kind(Assertion), assert_failure(E)};
            panic when Module =:= <<"gleeunit/should">> ->
                {failed, should_failure(Message)};
            panic ->
                {kind(Assertion), #{kind => panic, message => text(Message)}};
            todo ->
                {error, #{kind => todo, message => text(Message)}};
            let_assert ->
                {kind(Assertion), #{kind => let_assert, value => inspect(maps:get(value, E, nil))}};
            _ ->
                {error, #{kind => gleam_error, gleamKind => fmt("~p", [Kind]), message => text(Message)}}
        end,
    {Status, case Location of
                 undefined -> Failure;
                 _ -> Failure#{location => Location}
             end};
describe(Class, Reason, Stack, _TestModule) ->
    Failure = #{kind => exception, errorClass => fmt("~p", [Class]), reason => text(fmt("~0tP", [Reason, 20]))},
    {error, case top_frame(Stack) of
                undefined -> Failure;
                Frame -> Failure#{frame => Frame}
            end}.

kind(true) -> failed;
kind(false) -> error.

should_failure(<<"\n", Rest/binary>>) ->
    case binary:split(Rest, <<"\nshould equal\n">>) of
        [Actual, Expected] ->
            #{kind => should_equal, expected => text(Expected), actual => text(Actual)};
        _ ->
            case binary:split(Rest, <<"\nshould not equal\n">>) of
                [Actual, _] -> #{kind => should_not_equal, actual => text(Actual)};
                _ -> #{kind => assertion_message,
                       message => text(binary:replace(Rest, <<"\n">>, <<" ">>, [global]))}
            end
    end;
should_failure(Message) ->
    #{kind => assertion_message, message => text(Message)}.

assert_failure(#{kind := binary_operator, operator := Op, left := L, right := R}) ->
    #{kind => assert, assertKind => binary_operator, operator => atom_to_binary(Op),
      left => expr(L), right => expr(R)};
assert_failure(#{kind := function_call, arguments := Args}) ->
    #{kind => assert, assertKind => function_call, arguments => [expr(A) || A <- Args]};
assert_failure(_) ->
    #{kind => assert, assertKind => expression}.

%% null = not evaluated (short-circuited operand).
expr(#{kind := unevaluated}) -> null;
expr(#{value := V}) -> inspect(V);
expr(_) -> <<"?">>.

location(#{file := File, line := Line}) when is_binary(File), is_integer(Line) ->
    #{file => short_path(File), line => Line};
location(_) ->
    undefined.

caller_location(Stack, TestModule) ->
    Erl = binary_to_atom(binary:replace(TestModule, <<"/">>, <<"@">>, [global]), utf8),
    case [Info || {M, _F, _A, Info} <- Stack, M =:= Erl] of
        [Info | _] ->
            case {proplists:get_value(file, Info), proplists:get_value(line, Info)} of
                {File, Line} when is_list(File), is_integer(Line) ->
                    #{file => short_path(unicode:characters_to_binary(File)), line => Line};
                _ -> undefined
            end;
        [] -> undefined
    end.

short_path(File) ->
    case binary:match(File, [<<"/src/">>, <<"/test/">>]) of
        {Pos, _} -> binary:part(File, Pos + 1, byte_size(File) - Pos - 1);
        nomatch -> File
    end.

top_frame([{M, F, A, Info} | _]) when is_atom(M), is_atom(F) ->
    Arity = case A of L when is_list(L) -> length(L); N -> N end,
    Frame = #{module => atom_to_binary(M), function => atom_to_binary(F), arity => Arity},
    case proplists:get_value(line, Info) of
        Line when is_integer(Line) -> Frame#{line => Line};
        _ -> Frame
    end;
top_frame(_) ->
    undefined.

text(Bin) when is_binary(Bin) -> truncate(Bin, ?MAX_MESSAGE);
text(Other) -> truncate(fmt("~0tP", [Other, 30]), ?MAX_MESSAGE).

inspect(V) ->
    try truncate(gleam@string:inspect(V), ?MAX_MESSAGE)
    catch _:_ -> fmt("~0tP", [V, 30])
    end.

%% ---------------------------------------------------------------- utilities

emit(Map) ->
    Marker = persistent_term:get({?MODULE, marker}),
    io:put_chars(standard_io, [<<"\n">>, Marker, encode(Map), <<"\n">>]).

safe_emit(Map) ->
    try emit(Map)
    catch _:_ -> io:put_chars(standard_error, [encode(Map), <<"\n">>])
    end.

%% ASCII-only JSON so the stdout device encoding never matters.
encode(Map) ->
    json:encode(Map, fun
        (V, _Enc) when is_binary(V) -> json:encode_binary_escape_all(V);
        (V, Enc) -> json:encode_value(V, Enc)
    end).

fmt(Format, Args) ->
    case unicode:characters_to_binary(io_lib:format(Format, Args)) of
        Bin when is_binary(Bin) -> Bin;
        _ -> list_to_binary(io_lib:format("~p", [Args]))
    end.

truncate(Bin, Max) when byte_size(Bin) =< Max -> Bin;
truncate(Bin, Max) -> utf8_prefix(binary:part(Bin, 0, max(Max, 0))).

%% Drops a trailing partial UTF-8 sequence.
utf8_prefix(Bin) ->
    case unicode:characters_to_binary(Bin) of
        Ok when is_binary(Ok) -> Ok;
        {incomplete, Ok, _} -> Ok;
        {error, Ok, _} -> Ok
    end.

now_ms() ->
    erlang:monotonic_time(millisecond).
