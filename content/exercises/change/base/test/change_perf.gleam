import change

pub fn setup(size: Int) -> #(List(Int), Int) {
  #([1, 2, 5, 10, 20, 50, 100], size)
}

pub fn run(input: #(List(Int), Int)) {
  change.find_fewest_coins(input.0, input.1)
}
