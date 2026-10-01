The existing `update_price` did price calculation, drop-rate checking, log printing and notification sending all in one function. Printing and notifying are effects, so a test had no way to see "who got what". This time, the solution is to turn the effects into **values that describe them without running them**.

```gleam
pub type Effect {
  Log(message: String)
  Notify(customer: String, message: String)
}
```

`change_price` returns the new product together with a list of "things to do". The list is plain data, so `should.equal` can compare it down to the order, and nothing happens no matter how many times you call it. The actual running happens in one place only, in `update_price`, with `list.each(effects, run)`. Even if notifications later switch to email, you only need to change `run`; the calculation logic and the tests stay the same.

Separating the drop-rate calculation into `drop_percent` also lets you check the rule's boundaries on their own. When the price goes up the formula gives a negative number, so you have to clamp it to 0. When the original price is 0 or less, the rule also says to return 0. Gleam's integer division returns 0 instead of an error when dividing by zero, but writing the condition out makes the intent clearer to the reader than relying on that property. The threshold is "20% or more", so it is `>= 20`.

A common mistake is building the notification list with a `fold` that prepends, as in `[Notify(..), ..acc]`. That reverses the order of the notifications and pushes the log entry to the very end. Making one value per element is a job for `list.map`, which preserves order, and the log entry goes at the front with `[log, ..notices]`.

Representing effects as data and pushing their execution to the edges is the core of the theory note "Separating computation from effects".
