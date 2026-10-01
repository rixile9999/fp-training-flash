The original function promises a `Result` in its type, but in practice it cannot return a value for some inputs and crashes instead. A function like this is called a **partial function**. Even if the caller has written code to handle `Error`, that code is never reached (the **Total and partial functions (total-vs-partial-functions)** topic).

The fixed code replaces the two `let assert` lines with `use ... <- result.try(...)` in the same places.

- The `Error(Nil)` from `string.split_once(line, "=")` becomes `result.replace_error(MissingEquals(line))`, and
- the `Error(Nil)` from `int.parse(value)` becomes `result.replace_error(NotANumber(value))`.

The structure stays the same; only "crash on failure" turns into "return an error value on failure". The success path still reads from top to bottom (the **Chaining Results and monads** topic). Now every input produces either `Ok` or `Error`, so the server can decide for itself what to do, such as collecting and showing the invalid lines or skipping just those lines (the **Errors as values** topic).

Common mistakes:

- Using `result.unwrap(0)` to get rid of the crash. It no longer crashes, but a mistyped setting quietly becomes 0. That is even harder to track down than a crash.
- Putting the whole line in the error. `NotANumber` should hold only the offending value, so you can see right away what to fix.
- Splitting with `string.split(line, "=")` and allowing only two pieces. `"query=a=b"` is a line that has an `=`, so it is not `MissingEquals` but a problem with the value `"a=b"`.
