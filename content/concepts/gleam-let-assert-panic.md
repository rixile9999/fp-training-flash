---
id: gleam-let-assert-panic
title: let assert, panic, todo
language: gleam
source: { kind: original }
---
아래 문법은 모두 조건이 어긋나면 그 프로세스를 **즉시 멈춘다**. 그래서 "절대 일어나지 않아야 하는" 상황에만
쓰고, 예상 가능한 실패는 `Result`로 돌려준다.

| 문법 | 멈추는 때 | 쓰는 곳 |
|---|---|---|
| `let assert [first, ..] = xs` | 값이 패턴과 맞지 않을 때 | 앞 단계에서 이미 보장된 모양을 꺼낼 때, 테스트 |
| `let assert Ok(n) = r as "메시지"` | 위와 같음, 메시지 포함 | 실패 원인을 로그에 남기고 싶을 때 |
| `panic as "메시지"` | 그 줄에 도달하면 항상 | 논리적으로 도달할 수 없는 분기 |
| `todo as "메시지"` | 그 줄에 도달하면 항상 (컴파일 경고) | 아직 작성하지 않은 부분의 자리 표시 |
| `assert 식` | 식이 `False`일 때 | 테스트의 검증 |

```gleam
pub fn first_or_crash(xs: List(Int)) -> Int {
  let assert [first, ..] = xs as "빈 목록은 올 수 없다"
  first
}

pub fn grade_label(score: Int) -> String {
  case score {
    s if s >= 90 -> "A"
    s if s >= 0 -> "B"
    _ -> panic as "점수는 검증 단계에서 0 이상으로 걸러졌어야 한다"
  }
}
```

`let assert`와 `panic`은 오류를 타입에 드러내지 않으므로, 호출하는 쪽은 실패 가능성을 알 수 없다.
입력 검증처럼 실패가 정상적인 결과 중 하나라면 `Result`를 쓴다.

흔한 실수: 사용자 입력 파싱에 `let assert Ok(n) = int.parse(text)`를 쓴다. 잘못된 입력 하나로 프로세스가
멈추므로, `case`나 `result.try`로 `Error`를 돌려주도록 바꾼다.
