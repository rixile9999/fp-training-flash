---
id: gleam-recursion
title: 재귀와 누적자
language: gleam
source: { kind: original }
---
Gleam에는 `for`·`while` 반복문이 없다. 반복은 자기 자신을 다시 부르는 **재귀**로 쓴다. 리스트는
`[]`(비었음)과 `[x, ..rest]`(첫 항목과 나머지) 두 모양뿐이므로, 이 두 경우만 처리하면 된다.

| 구성 요소 | 역할 |
|---|---|
| 기저 사례 | 더 나눌 수 없는 입력(`[]`, `0`)의 답을 바로 돌려준다 |
| 재귀 사례 | 입력을 한 단계 줄여(`rest`, `n - 1`) 자기 자신을 부른다 |
| 누적자 `acc` | 지금까지의 결과를 인자로 들고 다닌다 |
| 보조 함수 | 누적자 초깃값을 숨기는 비공개 `loop` 함수 |

```gleam
import gleam/list

// 단순 재귀: 돌아오면서 더한다.
pub fn sum(xs: List(Int)) -> Int {
  case xs {
    [] -> 0
    [x, ..rest] -> x + sum(rest)
  }
}

// 꼬리 재귀: 재귀 호출이 마지막 일이라 호출 스택이 쌓이지 않는다.
pub fn doubled(xs: List(Int)) -> List(Int) {
  doubled_loop(xs, [])
}

fn doubled_loop(xs: List(Int), acc: List(Int)) -> List(Int) {
  case xs {
    [] -> list.reverse(acc)
    [x, ..rest] -> doubled_loop(rest, [x * 2, ..acc])
  }
}
// doubled([1, 2, 3]) == [2, 4, 6]
```

입력이 매우 길 수 있으면 꼬리 재귀로 쓴다. 단순한 변환이라면 `list.map`·`list.fold`가 이미 이 패턴을 담고 있다.

흔한 실수: 누적자 리스트는 앞에 붙여 만들기 때문에 거꾸로 쌓인다. 기저 사례에서 `list.reverse`를 빠뜨리면
결과 순서가 뒤집힌다.
