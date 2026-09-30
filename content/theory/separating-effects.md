---
id: separating-effects
title: 계산과 효과 분리하기
level: basic
relatedSkills: [function-decomposition]
furtherReading:
  - text: 'Simon Peyton Jones, Philip Wadler, "Imperative functional programming", POPL 1993'
    verified: false
  - text: 'Gary Bernhardt, "Boundaries" (conference talk), 2012'
    verified: false
---
프로그램은 결국 바깥 세계와 상호작용해야 한다. 화면에 출력하고, 파일을 읽고, 현재 시각을 확인하고, 다른 프로세스에 메시지를 보낸다. 이런 일을 **효과**라고 한다. 효과 자체는 나쁘지 않다. 문제는 효과가 계산 한가운데 섞일 때 생긴다.

Gleam은 효과를 타입으로 표시하지 않는다. `fn(List(Item)) -> Nil`인 함수가 무엇을 출력하는지 시그니처로는 알 수 없고, 테스트는 반환값 `Nil`만 확인할 수 있다. 그래서 분리는 코드의 **구조**로 한다.

- **순수한 코어**: 무엇을 할지 결정하고, 그 결정을 **데이터**로 돌려준다. 출력할 줄의 목록, 저장할 레코드, 보낼 메시지를 값으로 만든다.
- **얇은 껍데기**: 코어가 준 데이터를 받아 실제 효과를 수행한다. 분기나 계산은 거의 없다.

```gleam
import gleam/int
import gleam/io
import gleam/list

pub type Item {
  Item(name: String, stock: Int)
}

pub fn low_stock_warnings(items: List(Item), threshold: Int) -> List(String) {
  items
  |> list.filter(fn(item) { item.stock < threshold })
  |> list.map(fn(item) {
    item.name <> " 재고 " <> int.to_string(item.stock) <> "개"
  })
}

pub fn report(items: List(Item)) -> Nil {
  low_stock_warnings(items, 5)
  |> list.each(io.println)
}
```

`low_stock_warnings`는 순수하므로 `should.equal(["사과 재고 3개"])`처럼 결과를 직접 비교해 테스트한다. 기준값, 문구, 순서에 관한 모든 규칙이 여기에 있다. `report`는 두 줄짜리 연결 코드라 틀릴 여지가 거의 없다.

## 입력 쪽 효과도 밖으로

현재 시각, 난수, 설정 파일 내용처럼 **읽는** 효과도 같다. 계산 함수 안에서 시각을 직접 읽지 말고 인자로 받는다. `is_expired(coupon, now)`는 어떤 시각으로든 테스트할 수 있지만, 안에서 시각을 읽는 `is_expired(coupon)`은 실행할 때마다 결과가 달라질 수 있다.

## 왜 이렇게 나누는가

- **테스트**: 코어는 값 비교로 검증되고, 결과가 실행할 때마다 같다.
- **재사용**: 같은 경고 목록을 콘솔에 찍거나, 파일에 쓰거나, 응답 본문으로 보낼 수 있다. 코어는 바뀌지 않는다.
- **추론**: 코어의 함수들은 참조 투명하므로 자유롭게 나누고 합칠 수 있다(참조 투명성 참고).

흔한 실수는 계산 도중에 `io.println`을 호출하는 것, 결과를 돌려주지 않고 `Nil`만 돌려줘 무엇을 했는지 확인할 수 없게 만드는 것, 그리고 코어 깊숙한 곳에서 시각이나 설정을 직접 읽는 것이다.

## 이 개념이 쓰이는 곳

- 로그, 보고서, 알림처럼 출력이 필요한 기능을 "출력할 내용을 만드는 함수"와 "출력하는 함수"로 나눌 때.
- 시각, 난수, 설정에 의존하는 규칙을 인자로 받도록 바꿔 테스트 가능하게 만들 때.
- 효과가 섞인 긴 함수를 순수한 단계와 효과 단계로 분해하는 리팩터링에서.
