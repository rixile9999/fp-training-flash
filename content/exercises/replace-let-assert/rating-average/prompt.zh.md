`average_rating` 在商品页面上显示评论的平均分。对还没有评论的商品，进程会因 `panic` 崩溃；混入了错误存储的评分时，又会因 `let assert` 崩溃。不能因为一个商品页面就让请求处理停下来。

请去掉 `panic` 和 `let assert`，把问题以 `RatingError` 值返回。

```gleam
pub type RatingError {
  NoRatings
  OutOfRange(Int)
}

pub fn average_rating(ratings: List(Int)) -> Result(Float, RatingError)
```

- 评分列表为空时，返回 `Error(NoRatings)`。
- 正确的评分在 1 到 5 之间（含）。有超出范围的评分时，返回 `Error(OutOfRange(该评分))`。有多个时，报告列表中最前面的那个。
- 全部正确时，以 `Float` 返回平均值（与现在相同）。

```gleam
average_rating([4, 5])     // -> Ok(4.5)
average_rating([3, 7])     // 现在：崩溃   修复后：Error(OutOfRange(7))
```
