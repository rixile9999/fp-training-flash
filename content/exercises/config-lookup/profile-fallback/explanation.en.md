`resolve` chains three lookups, each in a different way.

- **Finding the profile is chained with `result.try`**, because a failure there must end things. A profile name that doesn't exist is usually a typo, so falling back to default would hide the mistake.
- **Finding the key is chained with `result.lazy_or`**. A key missing from the profile is a normal situation, and only then do you look at default. `lazy_or` runs the function only when the previous result is an `Error`, so the priority (profile → default) shows up in the code in exactly that order.
- At the end, `result.replace_error(MissingKey(key))` turns "not found anywhere" into this exercise's error. Since `from_default` returns `Result(String, Nil)`, a missing default profile goes down the same path.

`try` means "continue on success", and `lazy_or` means "try an alternative on failure". Using these two kinds of chaining for what each is meant for is what the theory note "Chaining Results and monads" (chaining-results-monads) looks like in practice.

`resolve_int` doesn't reimplement the fallback rule; it just chains `int.parse` onto the result of `resolve`. That way, "the rule for finding a value" and "the rule for interpreting a value" don't get mixed up. If the value found is wrong, that's a configuration mistake, so it must be reported as `NotAnInt` (theory note "Errors are values too").

Common mistakes:

- Treating a profile that doesn't exist like empty settings and returning the default value.
- In `resolve_int`, making parse failures a fallback target too, as in "convert the profile value to an integer, and if that fails, use default". A mistyped production setting is then quietly replaced with the default.
- Looking in default first, so the profile's value is ignored.
