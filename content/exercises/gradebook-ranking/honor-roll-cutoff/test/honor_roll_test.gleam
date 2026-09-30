import gleeunit/should
import honor_roll.{Student, honor_roll}

pub fn empty_class_test() {
  honor_roll([], 3)
  |> should.equal([])
}

pub fn top_n_test() {
  honor_roll(
    [
      Student("민수", 80),
      Student("지아", 95),
      Student("하준", 70),
      Student("서연", 88),
    ],
    2,
  )
  |> should.equal(["지아", "서연"])
}

pub fn includes_ties_at_cutoff_test() {
  honor_roll(
    [
      Student("다온", 88),
      Student("가람", 97),
      Student("나윤", 88),
      Student("라희", 75),
    ],
    2,
  )
  |> should.equal(["가람", "나윤", "다온"])
}

pub fn zero_limit_test() {
  honor_roll([Student("지아", 95), Student("민수", 80)], 0)
  |> should.equal([])
}

pub fn limit_exceeds_count_test() {
  honor_roll([Student("민수", 80), Student("지아", 95)], 5)
  |> should.equal(["지아", "민수"])
}

pub fn tied_names_in_order_test() {
  honor_roll(
    [Student("타미", 90), Student("바다", 90), Student("나무", 90)],
    1,
  )
  |> should.equal(["나무", "바다", "타미"])
}
