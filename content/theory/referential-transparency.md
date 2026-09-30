---
id: referential-transparency
title: 참조 투명성, 식을 값으로 바꿔도 되는 조건
level: basic
relatedSkills: [function-decomposition]
furtherReading:
  - text: 'Christopher Strachey, "Fundamental Concepts in Programming Languages", lecture notes 1967, reprinted in Higher-Order and Symbolic Computation 13, 2000'
    verified: false
  - text: 'Harald Søndergaard, Peter Sestoft, "Referential transparency, definiteness and unfoldability", Acta Informatica 27, 1990'
    verified: false
---
어떤 식을 그 식의 값으로 바꿔 써도 프로그램의 의미가 달라지지 않으면 그 식은 **참조 투명**하다. 함수 호출이 참조 투명하려면 결과가 인자에만 의존하고, 호출이 결과 말고는 바깥에서 관찰할 수 있는 일(출력, 파일 쓰기, 메시지 전송, 전역 상태 변경)을 하지 않아야 한다. 이런 함수를 순수 함수라고 부른다.

```gleam
pub fn line_total(price: Int, quantity: Int) -> Int {
  price * quantity
}

pub fn doubled() -> Int {
  let t = line_total(1200, 3)
  t + t
}
```

`doubled`에서 `t`를 `line_total(1200, 3)`으로 바꿔 써도, 거꾸로 `line_total(1200, 3) + line_total(1200, 3)`을 `let`으로 묶어도 결과는 똑같이 7200이다. 수학에서 같은 것을 같은 것으로 바꾸듯 코드를 다룰 수 있다(등식 추론).

## Gleam은 순수성을 강제하지 않는다

Gleam은 Haskell과 달리 효과를 타입으로 추적하지 않는다. 어떤 함수든 `io.println`을 부르거나, 다른 프로세스에 메시지를 보내거나, 외부 함수로 현재 시각을 읽을 수 있다. 시그니처가 같아도 순수하지 않을 수 있다.

```gleam
import gleam/io

pub fn noisy_total(price: Int, quantity: Int) -> Int {
  io.println("계산 중")
  price * quantity
}
```

`let t = noisy_total(1200, 3)` 뒤에 `t + t`를 계산하면 한 번 출력하지만, `noisy_total(1200, 3) + noisy_total(1200, 3)`은 두 번 출력한다. 반환값은 같아도 관찰 가능한 동작이 다르므로 이 호출은 참조 투명하지 않다. 현재 시각이나 난수를 읽는 함수는 같은 인자로 불러도 결과 자체가 달라진다. 그래서 Gleam에서 참조 투명성은 컴파일러가 아니라 **설계**로 지키는 성질이다.

## 왜 지킬 가치가 있는가

- **함수 추출이 안전하다**: 긴 함수의 한 부분을 떼어 이름을 붙이거나, 반복되는 식을 변수 하나로 묶어도 의미가 변하지 않는다. 함수 분해 리팩터링의 전제 조건이다.
- **테스트가 단순하다**: 입력을 주고 결과를 `should.equal`로 비교하면 끝이다. 가짜 객체나 출력 가로채기가 필요 없다.
- **순서와 횟수가 자유롭다**: 결과를 캐시하거나, 계산 순서를 바꾸거나, 필요 없는 호출을 지워도 된다.

흔한 실수는 계산 도중에 로그를 찍거나 현재 시각을 직접 읽어서, 겉보기에는 계산 함수인데 테스트할 수 없는 함수를 만드는 것이다. 이런 값은 인자로 받고, 출력할 내용은 데이터로 돌려준다(계산과 효과 분리하기 참고).

## 이 개념이 쓰이는 곳

- 긴 함수를 작은 함수로 나눌 때 각 조각이 순수한지 먼저 확인한다.
- 같은 인자로 같은 결과가 나와야 하는 테스트를 설계할 때.
- 코드가 무엇을 출력할지 예측하는 문제에서 효과가 있는 호출의 횟수와 순서를 따질 때.
