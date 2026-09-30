import change

pub fn setup(size: Int) -> #(List(Int), Int) {
  #([1, 2, 5, 10, 20, 50, 100, 200], size)
}

pub fn run(input: #(List(Int), Int)) -> Int {
  change.count_ways(input.0, input.1)
}
