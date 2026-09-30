%% Grader-internal test harness. Learner code cannot reach this module: static checks reject
%% `@external` and imports of `fp_internal/*`.
%%
%% Protocol (see modules/grading/src/runner/protocol.ts):
%%   input : .fp/nonce (random marker) and .fp/job.json, both deleted before any learner code runs
%%           job = {"tests": ["<module>.<fn>", ...], "timeMs": N, "memoryMb": N,
%%                  "perf": null | {"module": "<module>", "sizes": [N, ...]}}
%%   output: one line per event on stdout: "@@FP:<nonce>@@" ++ JSON (ASCII only).
%%           events: hello, test, perf, perf_skipped, harness_error, done.
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
                Msg = fmt("전체 실행 시간 제한(~b ms)을 이미 다 써서 실행하지 않았습니다.",
                          [maps:get(time_ms, Limits)]),
                emit_test(Name, timeout, Msg, 0),
                timeout
        end,
    run_tests(Rest, Deadline, Limits, AllPassed andalso Status =:= passed).

run_test(Name, Timeout, Limits) ->
    case resolve(Name) of
        {error, Msg} ->
            emit_test(Name, error, Msg, 0),
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
            {Status, Msg} =
                case Outcome of
                    {ok, passed} -> {passed, undefined};
                    {ok, {Kind, Text}} -> {Kind, Text};
                    timeout ->
                        {timeout, fmt("시간 제한(~b ms)을 넘었습니다. 무한 루프나 너무 느린 계산이 있는지 확인하세요.",
                                      [maps:get(time_ms, Limits)])};
                    killed ->
                        {error, fmt("메모리 한도(~b MB)를 넘어 실행이 중단되었습니다.",
                                    [maps:get(memory_mb, Limits)])};
                    {crashed, Reason} ->
                        {error, fmt("테스트 프로세스가 비정상 종료되었습니다: ~0P", [Reason, 20])}
                end,
            emit_test(Name, Status, with_output(Status, Msg, Output), Duration),
            Status
    end.

emit_test(Name, Status, Msg, Duration) ->
    Base = #{type => test, name => Name, status => Status, durationMs => Duration},
    emit(case Msg of
             undefined -> Base;
             _ -> Base#{message => truncate(Msg, ?MAX_MESSAGE)}
         end).

with_output(_Status, Msg, <<>>) -> Msg;
with_output(passed, Msg, _Output) -> Msg;
with_output(_Status, undefined, Output) -> fmt("출력:~n~ts", [Output]);
with_output(_Status, Msg, Output) -> fmt("~ts~n~n출력:~n~ts", [Msg, Output]).

resolve(Name) ->
    case string:split(Name, ".", trailing) of
        [ModuleName, FunctionName] when ModuleName =/= <<>>, FunctionName =/= <<>> ->
            case load(ModuleName) of
                {ok, Module} ->
                    Function = binary_to_atom(FunctionName, utf8),
                    case erlang:function_exported(Module, Function, 0) of
                        true -> {ok, Module, Function, ModuleName};
                        false -> {error, fmt("테스트 함수 ~ts를 찾을 수 없습니다.", [Name])}
                    end;
                error ->
                    {error, fmt("테스트 모듈 ~ts를 찾을 수 없습니다.", [ModuleName])}
            end;
        _ ->
            {error, fmt("잘못된 테스트 이름: ~ts", [Name])}
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
    Output = receive {captured, Capture, Bin} -> Bin after 1000 -> <<>> end,
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
            Out = case Truncated of
                      true -> <<Buf/binary, "\n...(출력 생략)"/utf8>>;
                      false -> Buf
                  end,
            From ! {captured, self(), Out};
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

%% ---------------------------------------------------------------- failure messages

%% Returns {failed | error, Message}. "failed" = an assertion in the test code (gleeunit/should,
%% `assert`, `let assert`/`panic` in the test module, qcheck); "error" = anything else (a crash,
%% `todo` or `panic` in learner code, ...).
describe(error, #{gleam_error := Kind} = E, Stack, TestModule) ->
    Module = maps:get(module, E, <<>>),
    Assertion = Module =:= TestModule orelse Module =:= <<"gleeunit/should">>
        orelse Module =:= <<"qcheck">> orelse string:prefix(Module, <<"qcheck/">>) =/= nomatch,
    Where = case Module of
                %% should.equal panics inside gleeunit: point at the calling test line when the frame
                %% survived (tail calls drop it); a location inside gleeunit is useless.
                <<"gleeunit/should">> -> caller_location(Stack, TestModule, <<>>);
                _ -> location(E)
            end,
    case Kind of
        assert ->
            {kind(Assertion), fmt("assert 실패: ~ts~ts", [assert_detail(E), Where])};
        panic when Module =:= <<"gleeunit/should">> ->
            {failed, fmt("~ts~ts", [should_detail(maps:get(message, E, <<>>)), Where])};
        panic ->
            {kind(Assertion), fmt("panic: ~ts~ts", [maps:get(message, E, <<>>), Where])};
        todo ->
            {error, fmt("아직 구현되지 않은 코드(todo)에 도달했습니다: ~ts~ts",
                        [maps:get(message, E, <<>>), Where])};
        let_assert ->
            {kind(Assertion), fmt("let assert 패턴이 값과 맞지 않습니다. 값: ~ts~ts",
                                  [inspect(maps:get(value, E, nil)), Where])};
        _ ->
            {error, fmt("~p: ~ts~ts", [Kind, maps:get(message, E, <<>>), Where])}
    end;
describe(Class, Reason, Stack, _TestModule) ->
    {error, fmt("실행 중 오류가 발생했습니다 (~p): ~0tP~ts", [Class, Reason, 20, top_frame(Stack)])}.

kind(true) -> failed;
kind(false) -> error.

should_detail(<<"\n", Rest/binary>>) ->
    case binary:split(Rest, <<"\nshould equal\n">>) of
        [Actual, Expected] ->
            fmt("값이 기대와 다릅니다.~n  기대값: ~ts~n  실제값: ~ts", [Expected, Actual]);
        _ ->
            case binary:split(Rest, <<"\nshould not equal\n">>) of
                [Actual, _] -> fmt("두 값이 달라야 하는데 같습니다: ~ts", [Actual]);
                _ -> binary:replace(Rest, <<"\n">>, <<" ">>, [global])
            end
    end;
should_detail(Message) ->
    Message.

assert_detail(#{kind := binary_operator, operator := Op, left := L, right := R}) ->
    fmt("`~ts` 비교가 거짓입니다.~n  왼쪽 값: ~ts~n  오른쪽 값: ~ts", [atom_to_binary(Op), expr(L), expr(R)]);
assert_detail(#{kind := function_call, arguments := Args}) ->
    fmt("함수 호출 결과가 False입니다. 인자: ~ts",
        [lists:join(<<", ">>, [expr(A) || A <- Args])]);
assert_detail(_) ->
    <<"식의 값이 False입니다."/utf8>>.

expr(#{kind := unevaluated}) -> <<"(평가되지 않음)"/utf8>>;
expr(#{value := V}) -> inspect(V);
expr(_) -> <<"?">>.

location(#{file := File, line := Line}) ->
    fmt(" (~ts:~b)", [short_path(File), Line]);
location(_) ->
    <<>>.

caller_location(Stack, TestModule, Default) ->
    Erl = binary_to_atom(binary:replace(TestModule, <<"/">>, <<"@">>, [global]), utf8),
    case [Info || {M, _F, _A, Info} <- Stack, M =:= Erl] of
        [Info | _] ->
            case {proplists:get_value(file, Info), proplists:get_value(line, Info)} of
                {File, Line} when is_list(File), is_integer(Line) ->
                    fmt(" (~ts:~b)", [short_path(unicode:characters_to_binary(File)), Line]);
                _ -> Default
            end;
        [] -> Default
    end.

short_path(File) ->
    case binary:match(File, [<<"/src/">>, <<"/test/">>]) of
        {Pos, _} -> binary:part(File, Pos + 1, byte_size(File) - Pos - 1);
        nomatch -> File
    end.

top_frame([{M, F, A, Info} | _]) ->
    Arity = case A of L when is_list(L) -> length(L); N -> N end,
    case proplists:get_value(line, Info) of
        undefined -> fmt(" (~p:~p/~b)", [M, F, Arity]);
        Line -> fmt(" (~p:~p/~b, ~b행)", [M, F, Arity, Line])
    end;
top_frame(_) ->
    <<>>.

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
