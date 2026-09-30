import gleeunit/should
import restock.{Item, Stock, restock}

pub fn empty_list_test() {
  restock([])
  |> should.equal([])
}

pub fn restocks_low_item_test() {
  restock([Item("P-01", "볼펜", Stock(3, 5, 20))])
  |> should.equal([Item("P-01", "볼펜", Stock(23, 5, 20))])
}

pub fn keeps_other_items_test() {
  restock([
    Item("P-01", "볼펜", Stock(3, 5, 20)),
    Item("N-07", "노트", Stock(40, 10, 30)),
  ])
  |> should.equal([
    Item("P-01", "볼펜", Stock(23, 5, 20)),
    Item("N-07", "노트", Stock(40, 10, 30)),
  ])
}

pub fn restocks_at_reorder_point_test() {
  restock([Item("E-02", "지우개", Stock(10, 10, 15))])
  |> should.equal([Item("E-02", "지우개", Stock(25, 10, 15))])
}

pub fn keeps_other_fields_test() {
  restock([Item("T-11", "테이프", Stock(4, 8, 12))])
  |> should.equal([Item("T-11", "테이프", Stock(16, 8, 12))])
}

pub fn keeps_order_test() {
  restock([
    Item("C", "클립", Stock(100, 20, 50)),
    Item("A", "자", Stock(0, 2, 5)),
    Item("B", "풀", Stock(7, 3, 10)),
    Item("D", "가위", Stock(1, 1, 4)),
  ])
  |> should.equal([
    Item("C", "클립", Stock(100, 20, 50)),
    Item("A", "자", Stock(5, 2, 5)),
    Item("B", "풀", Stock(7, 3, 10)),
    Item("D", "가위", Stock(5, 1, 4)),
  ])
}
