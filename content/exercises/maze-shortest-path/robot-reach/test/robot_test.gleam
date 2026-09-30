import gleeunit/should
import robot

pub fn zero_steps_counts_start_test() {
  robot.reachable_count(["..S.."], 0)
  |> should.equal(1)
}

pub fn corridor_limit_test() {
  robot.reachable_count(["S...."], 2)
  |> should.equal(3)
}

pub fn walls_block_test() {
  robot.reachable_count(
    [
      ".#..",
      "S#..",
      "....",
    ],
    3,
  )
  |> should.equal(5)
}

pub fn counts_each_cell_once_test() {
  robot.reachable_count(
    [
      "...",
      ".S.",
      "...",
    ],
    2,
  )
  |> should.equal(9)
}

pub fn open_floor_uses_shortest_distance_test() {
  // 왼쪽 위 모서리에서 4번 이하: 행 + 열 <= 4인 칸 15개
  robot.reachable_count(
    [
      "S....",
      ".....",
      ".....",
      ".....",
      ".....",
    ],
    4,
  )
  |> should.equal(15)
}

pub fn stays_inside_grid_test() {
  robot.reachable_count(["S."], 3)
  |> should.equal(2)
}

pub fn walled_off_area_not_counted_test() {
  robot.reachable_count(
    [
      "S#..",
      ".#..",
    ],
    10,
  )
  |> should.equal(2)
}

pub fn no_robot_test() {
  robot.reachable_count(["....", "...."], 5)
  |> should.equal(0)
}
