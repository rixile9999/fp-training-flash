---
id: accumulators-and-tail-recursion
title: 누적자와 꼬리 재귀
level: basic
relatedSkills: [recursive-algorithms]
furtherReading:
  - text: 'Richard Bird, "Thinking Functionally with Haskell", Cambridge University Press, 2014'
    verified: false
  - text: 'Erlang System Documentation, Efficiency Guide, "The Seven Myths of Erlang Performance"'
    verified: false
---
재귀 함수가 결과를 만드는 방식은 두 가지다.

- **몸통 재귀**: 재귀 호출이 돌아온 **뒤에** 할 일이 남아 있다. `first + sum(rest)`는 덧셈을 하려고 호출 결과를 기다린다.
- **꼬리 재귀**: 재귀 호출이 함수가 하는 **마지막 일**이다. 남은 계산이 없으므로 호출 결과를 그대로 돌려준다.

몸통 재귀를 꼬리 재귀로 바꾸려면 "지금까지의 결과"를 인자로 들고 다녀야 한다. 이 인자를 누적자(accumulator)라고 한다.

```gleam
// 몸통 재귀: 덧셈이 재귀 호출이 끝나기를 기다린다
pub fn sum(numbers: List(Int)) -> Int {
  case numbers {
    [] -> 0
    [first, ..rest] -> first + sum(rest)
  }
}

// 꼬리 재귀: 부분합을 total에 쌓아 넘긴다. 초깃값은 공개 함수가 정한다
pub fn sum_with_acc(numbers: List(Int)) -> Int {
  sum_loop(numbers, 0)
}

fn sum_loop(numbers: List(Int), total: Int) -> Int {
  case numbers {
    [] -> total
    [first, ..rest] -> sum_loop(rest, total + first)
  }
}
```

누적자는 호출하는 쪽이 신경 쓸 값이 아니므로, 초깃값을 넣어 주는 공개 함수와 실제로 도는 비공개 함수로 나누는 것이 보통이다.

## 누적자의 불변식

누적자 함수가 맞는지는 "누적자에 무엇이 들어 있는가"를 한 문장으로 적어 보면 확인할 수 있다. `sum_loop(rest, total)`의 불변식은 **total + (rest의 합) = 원래 목록의 합**이다.

- 시작: `total`은 0이고 `rest`는 전체 목록이므로 성립한다.
- 한 단계: `first`를 `rest`에서 떼어 `total`에 더하므로 양변이 그대로다.
- 끝: `rest`가 `[]`이면 `total`이 곧 답이다.

초깃값은 불변식이 처음부터 성립하도록 고른다. 합이면 0, 곱이면 1, 목록이면 `[]`이다. 초깃값을 잘못 고르면 모든 결과가 틀어진다. 합의 초깃값을 1로 두면 모든 결과가 1씩 커지고, 곱의 초깃값을 0으로 두면 모든 결과가 0이 된다.

## 목록을 쌓으면 순서가 뒤집힌다

누적자에 목록을 쌓을 때는 앞에 붙인다(`[x, ..acc]`, O(1)). 그러면 결과가 입력의 역순이 되므로 마지막에 `list.reverse`를 한 번 호출한다(O(n)). 누적자를 여러 개 둘 수도 있다. 아래 함수는 누적 합과 결과 목록을 함께 들고 다닌다.

```gleam
import gleam/list

/// [3, 1, 4] -> [3, 4, 8]
pub fn running_totals(numbers: List(Int)) -> List(Int) {
  running_loop(numbers, 0, [])
}

fn running_loop(numbers: List(Int), total: Int, acc: List(Int)) -> List(Int) {
  case numbers {
    [] -> list.reverse(acc)
    [first, ..rest] -> {
      let total = total + first
      running_loop(rest, total, [total, ..acc])
    }
  }
}
```

흔한 실수는 순서를 맞추려고 매 단계 `list.append(acc, [x])`로 뒤에 붙이는 것이다. 결과는 맞지만 `append`가 매번 `acc` 전체를 복사하므로 전체 비용이 O(n²)이 된다. 뒤집기를 잊는 실수도 흔하다. 테스트가 원소 하나짜리 목록만 확인하면 드러나지 않는다.

## BEAM에서 꼬리 재귀가 주는 것과 주지 않는 것

BEAM은 꼬리 호출을 새 스택 프레임 없이 실행한다(last call optimization). 그래서 꼬리 재귀 함수는 몇 번을 반복하든 스택이 자라지 않는다. 몸통 재귀는 호출 깊이만큼 스택을 쓴다. 다만 BEAM 프로세스의 스택은 필요한 만큼 늘어나므로, 스택 크기가 고정된 다른 환경처럼 깊이 수만 정도에서 곧바로 넘치지는 않는다. 깊이에 비례하는 메모리를 쓸 뿐이다.

그래서 BEAM에서 "꼬리 재귀가 항상 더 빠르다"는 말은 맞지 않는다. 목록을 만드는 함수라면 몸통 재귀는 결과를 바로 제 순서로 만들고, 꼬리 재귀는 누적한 뒤 한 번 더 뒤집어야 한다. 둘의 속도와 메모리 사용량은 대체로 비슷하며, Erlang 효율 가이드도 이 오해를 따로 다룬다.

꼬리 재귀가 확실히 필요한 경우는 다음과 같다.

- 끝나지 않거나 아주 오래 도는 반복(서버 루프, 상태 기계). 몸통 재귀라면 반복 횟수만큼 메모리가 쌓인다.
- 메모리 한도가 정해진 환경에서 매우 긴 입력을 처리할 때.
- 결과가 합, 개수, 최댓값처럼 값 하나일 때. 누적자 버전은 일정한 메모리로 끝나고 뒤집기도 필요 없다.

`list.fold(numbers, 0, fn(total, x) { total + x })`는 이 누적자 반복을 이름 붙인 함수로 만든 것이다. 초깃값과 한 단계 갱신만 주면 된다.

## 이 개념이 쓰이는 곳

- 목록을 값 하나로 줄일 때. 직접 쓴 누적자 루프와 `list.fold`는 같은 모양이다.
- 결과 목록을 앞에 붙여 쌓고 마지막에 한 번 뒤집을 때.
- 이전 값과 현재 값, 합계와 개수처럼 여러 상태를 동시에 추적할 때 누적자를 여러 개 둔다.
- `append`로 뒤집기처럼 O(n²)인 재귀를 선형 시간으로 바꿀 때.
