import competition.{Student, rank}
import gleeunit/should

pub fn empty_class_test() {
  rank([])
  |> should.equal([])
}

pub fn distinct_scores_test() {
  rank([Student("민수", 80), Student("지아", 95), Student("하준", 70)])
  |> should.equal([#(1, "지아"), #(2, "민수"), #(3, "하준")])
}

pub fn tie_shares_rank_test() {
  rank([Student("하린", 95), Student("가은", 95)])
  |> should.equal([#(1, "가은"), #(1, "하린")])
}

pub fn rank_after_tie_skips_test() {
  rank([
    Student("도윤", 88),
    Student("가은", 95),
    Student("하린", 95),
    Student("나래", 70),
  ])
  |> should.equal([#(1, "가은"), #(1, "하린"), #(3, "도윤"), #(4, "나래")])
}

pub fn three_way_tie_test() {
  rank([
    Student("수아", 90),
    Student("윤호", 100),
    Student("아린", 90),
    Student("도하", 90),
    Student("라온", 60),
  ])
  |> should.equal([
    #(1, "윤호"),
    #(2, "도하"),
    #(2, "수아"),
    #(2, "아린"),
    #(5, "라온"),
  ])
}

pub fn tied_names_in_order_test() {
  rank([Student("타미", 77), Student("바다", 77), Student("나무", 77)])
  |> should.equal([#(1, "나무"), #(1, "바다"), #(1, "타미")])
}
