The key to this exercise is **stacking small functions as pipeline steps**. `first_letter` has three steps: "strip whitespace → first letter → empty string if there is none". `initial` also has three: "first letter → uppercase → period". With `|>`, the order in which you read the code matches the order in which the data flows. Compare it with a nested call like `string.append(string.uppercase(first_letter(name)), ".")`, which you have to read from the inside out.

`string.first` can fail on an empty string, so it returns `Result(String, Nil)`. Choosing a default with `result.unwrap("")` makes the function a total function that returns a value for every input. If you used `let assert` here, the program would stop on a name made only of whitespace.

A common mistake is putting a rule in the wrong step.

- If you uppercase inside `first_letter`, you break its promise to "return the first letter as is". Uppercasing is the job of `initial`, which builds the initial.
- If you forget `string.trim`, the first letter of `"\n\t Sarah"` becomes a newline character.

Because each later function calls the earlier ones, fixing `first_letter` also fixes `initial`, `initials` and `pair`: the rule lives in only one place. Each function always returns the same value for the same input (referential transparency), so you can trust pieces you tested separately and combine them. This idea is covered further in the theory note "Function composition and pipelines".
