`secret_add(3)` doesn't compute a number; it returns **"adding 3" as a value**. The body of `fn(x) { x + secret }` refers to `secret`, the outer function's argument. When the anonymous function is created, that value is captured along with it (a closure) and is used later when the function is called. That's why `secret_add(3)` and `secret_add(10)` are different functions.

`secret_combine` is a higher-order function that takes two functions and makes a new one. `fn(x) { secret_function2(secret_function1(x)) }` is the same as the mathematical composition g ∘ f. Nested calls run from the inside out, so `secret_function1` is applied first.

The common mistake is **order**.

- Subtraction and division are not commutative, so writing `secret - x` or `secret / x` is wrong. The input `x` goes on the left.
- If you swap the composition order, some cases happen to give the same value, like `secret_combine(secret_multiply(7), secret_divide(3))`, so the bug is found late. Check with order-sensitive examples, such as `add 3 to 4, then divide by 7` (= 1) versus `divide 4 by 7, then add 3` (= 3).

Making small operations into values and combining them as needed is the core of the theory note "Higher-order functions and modularity". When a new requirement comes up, you don't change the existing functions; you just change how they are combined.
