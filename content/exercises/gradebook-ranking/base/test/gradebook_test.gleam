import gleeunit/should
import gradebook.{Student, rank}

pub fn empty_class_test() {
  rank([])
  |> should.equal([])
}

pub fn ranks_by_score_test() {
  rank([Student("민수", 80), Student("지아", 95), Student("하준", 70)])
  |> should.equal([#(1, "지아"), #(2, "민수"), #(3, "하준")])
}

pub fn single_student_test() {
  rank([Student("서연", 88)])
  |> should.equal([#(1, "서연")])
}

pub fn tie_broken_by_name_test() {
  rank([Student("하준", 90), Student("민서", 97), Student("가은", 90)])
  |> should.equal([#(1, "민서"), #(2, "가은"), #(3, "하준")])
}

pub fn many_ties_test() {
  rank([
    Student("다온", 75),
    Student("라희", 80),
    Student("나윤", 75),
    Student("가람", 75),
  ])
  |> should.equal([#(1, "라희"), #(2, "가람"), #(3, "나윤"), #(4, "다온")])
}

pub fn result_does_not_depend_on_input_order_test() {
  let students = [
    Student("윤호", 60),
    Student("수아", 85),
    Student("도윤", 85),
    Student("아린", 92),
  ]
  let expected = [#(1, "아린"), #(2, "도윤"), #(3, "수아"), #(4, "윤호")]
  rank(students)
  |> should.equal(expected)
  rank([
    Student("수아", 85),
    Student("아린", 92),
    Student("윤호", 60),
    Student("도윤", 85),
  ])
  |> should.equal(expected)
}
