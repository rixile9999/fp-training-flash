四项检查都返回 `Result`，只要有一项失败，结果就是那个错误。`result.try` 表达的正是这种“成功就继续，失败就到此为止”的串联，而 `use` 让你可以不嵌套、从上到下地写出来。

```gleam
use username <- result.try(check_username(form.username))
```

这一行的意思是：“如果 `check_username` 是 `Ok(username)`，就带着 `username` 进入下一行；如果是 `Error(e)`，整个 `validate` 的结果就是 `Error(e)`”。叠起四行这样的代码，检查的顺序就是代码的顺序，遇到第一个错误后，其余的检查都不会执行（主题 **串联 Result 与单子（chaining-results-monads）**）。

检查函数返回的不是 `Bool` 而是 `Result(值, SignupError)`，这一点也很重要。成功值直接用作 `NewUser` 的原料，所以“只有通过检查的值才会进入用户记录”由结构本身来保证。失败原因由 `SignupError` 的构造器区分，界面可以据此选择合适的提示（主题 **错误也是值**、**和类型与穷尽匹配**）。

常见的错误是漏掉某项检查或调换了顺序。在只显示第一个错误的方式中，顺序就决定了用户会看到哪条提示，所以必须遵守规定的顺序。如果需要一次显示所有错误，就需要另一种组合方式（在同一系列的其他题目中讲解）。
