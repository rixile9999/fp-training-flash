n x n 체스판에 퀸 n개를 서로 공격하지 않게 놓는 배치 중 **사전순으로 가장 앞선** 배치를 찾으세요.

```gleam
pub fn first_solution(n: Int) -> Result(List(Int), Nil)
```

- 배치는 맨 위 행부터 차례로 각 행의 퀸이 놓인 열 번호(0부터)를 나열한 목록이다.
- 두 배치는 첫 번째 열 번호부터 비교하고, 같으면 다음 열 번호를 비교한다. 작은 쪽이 앞선다.
- 배치가 하나도 없으면 `Error(Nil)`을 돌려준다. `n`은 1 이상이다.

`is_safe(placed, col)`은 이미 있습니다. `placed`는 위쪽 행들의 열 번호로 **바로 윗 행이 맨 앞**이며, 다음 행의 `col` 열이 안전하면 `True`입니다.

```gleam
first_solution(4)  // -> Ok([1, 3, 0, 2])
first_solution(3)  // -> Error(Nil)
```
