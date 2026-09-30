import gleeunit/should
import shelf.{Shelf, Stock, refill}

pub fn refills_empty_shelf_test() {
  refill([Shelf("A1", "생수", Stock(0, 5, 24))])
  |> should.equal([Shelf("A1", "생수", Stock(24, 5, 24))])
}

pub fn keeps_stocked_shelf_test() {
  refill([Shelf("B3", "컵라면", Stock(9, 4, 12))])
  |> should.equal([Shelf("B3", "컵라면", Stock(9, 4, 12))])
}

pub fn mixed_shelves_test() {
  refill([
    Shelf("A1", "생수", Stock(2, 5, 24)),
    Shelf("B3", "컵라면", Stock(9, 4, 12)),
  ])
  |> should.equal([
    Shelf("A1", "생수", Stock(24, 5, 24)),
    Shelf("B3", "컵라면", Stock(9, 4, 12)),
  ])
}

pub fn fills_to_capacity_not_adds_test() {
  refill([Shelf("C2", "우유", Stock(3, 6, 10))])
  |> should.equal([Shelf("C2", "우유", Stock(10, 6, 10))])
}

pub fn at_minimum_not_refilled_test() {
  refill([Shelf("D4", "껌", Stock(5, 5, 30))])
  |> should.equal([Shelf("D4", "껌", Stock(5, 5, 30))])
}

pub fn keeps_order_test() {
  refill([
    Shelf("Z9", "빵", Stock(0, 2, 8)),
    Shelf("A1", "생수", Stock(20, 5, 24)),
    Shelf("M5", "주스", Stock(1, 3, 6)),
  ])
  |> should.equal([
    Shelf("Z9", "빵", Stock(8, 2, 8)),
    Shelf("A1", "생수", Stock(20, 5, 24)),
    Shelf("M5", "주스", Stock(6, 3, 6)),
  ])
}
