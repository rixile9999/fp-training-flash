The key point of this exercise is to represent "missing" and "invalid" as different values. The return type `Result(Option(Int), ConfigError)` holds all three cases.

| Situation | Value |
|---|---|
| An integer is written | `Ok(Some(n))` |
| The key is missing (fine, since the setting is optional) | `Ok(None)` |
| Something is written, but it is not an integer | `Error(NotAnInt(key, value))` |

`get_optional_int` first splits the result of `dict.get` with `case`. Only a missing key becomes `None`; if the key exists, the value always goes through `int.parse`. `get_int_or` takes that result as is and fills in the default **only for `None` inside `Ok`** with `result.map(option.unwrap(_, default))`. An `Error` doesn't pass through `result.map`, so an invalid value stays an error all the way. Because the rule lives in one place only (`get_optional_int`) and is reused, the two functions can never drift apart.

If you turn an invalid setting into a default, the program quietly runs with a different setting, while the operator believes the value they wrote is being used. Exposing failure as a value and letting the caller decide is the main point of the theory note "Errors are values too" (errors-as-values).

Common mistakes:

- `dict.get(...) |> result.try(int.parse) |> result.unwrap(default)`. The two failures merge into a single `Error(Nil)`, and then both become the default.
- Converting the `Result` to an `Option` with `option.from_result`. For the same reason, an invalid value becomes `None`.
- Treating an empty string as "missing". The fact that the key exists means someone tried to write a value.
