-module(sandbox_ffi).
-export([read_passwd/0, connect/0, write_outside/0, uid/0]).

read_passwd() ->
    case file:read_file("/etc/passwd") of
        {ok, Bin} -> {ok, byte_size(Bin)};
        {error, Reason} -> {error, atom_to_binary(Reason)}
    end.

connect() ->
    case gen_tcp:connect({1, 1, 1, 1}, 80, [binary], 3000) of
        {ok, Socket} -> gen_tcp:close(Socket), {ok, nil};
        {error, Reason} -> {error, atom_to_binary(Reason)}
    end.

write_outside() ->
    case file:write_file("/opt/fp/escaped", <<"x">>) of
        ok -> {ok, nil};
        {error, Reason} -> {error, atom_to_binary(Reason)}
    end.

uid() ->
    unicode:characters_to_binary(string:trim(os:cmd("id -u"))).
