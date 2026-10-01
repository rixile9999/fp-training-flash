The answer is `#(16, 13)`.

- `f = secret_combine(add3, double)` applies `add3` first and `double` after. `5 + 3 = 8`, `8 * 2 = 16`.
- `g = secret_combine(double, add3)` uses the opposite order. `5 * 2 = 10`, `10 + 3 = 13`.

In the body of `secret_combine`, `secret_function2(secret_function1(x))`, the inner call runs first, so **the first argument is applied first**. The point of this exercise is that composing the same two functions in a different order gives a different result; in other words, function composition is not commutative.

A common mistake is reading the mathematical notation g ∘ f from the left and thinking `double` comes first. If you rewrite it as a pipeline (`x |> add3 |> double`), where the argument order and the execution order are the same, it won't confuse you. It also matters that `add3` and `double` are pure functions that use only the values they captured, so their results are the same no matter when they are called, which is what makes this kind of prediction possible. See the theory note "Function composition and pipelines".
