import gleeunit/should
import pricing.{Item, Quote, line_log, quote, render}

pub fn line_log_test() {
  line_log(Item("사과", 1000, 3))
  |> should.equal("사과 x3 = 3000")
}

pub fn quote_total_test() {
  quote([Item("사과", 1000, 3), Item("배", 2500, 2)]).total
  |> should.equal(8000)
}

pub fn quote_log_test() {
  quote([Item("사과", 1000, 3), Item("배", 2500, 2)]).log
  |> should.equal(["사과 x3 = 3000", "배 x2 = 5000", "합계 = 8000"])
}

pub fn quote_log_order_test() {
  quote([Item("우유", 2000, 1), Item("빵", 3000, 2), Item("잼", 4500, 1)]).log
  |> should.equal([
    "우유 x1 = 2000",
    "빵 x2 = 6000",
    "잼 x1 = 4500",
    "합계 = 12500",
  ])
}

pub fn quote_empty_test() {
  quote([])
  |> should.equal(Quote(total: 0, log: ["합계 = 0"]))
}

pub fn render_test() {
  render(Quote(total: 3000, log: ["사과 x3 = 3000", "합계 = 3000"]))
  |> should.equal("사과 x3 = 3000\n합계 = 3000")
}

pub fn render_single_line_test() {
  render(Quote(total: 0, log: ["합계 = 0"]))
  |> should.equal("합계 = 0")
}
