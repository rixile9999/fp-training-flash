---
id: errors-as-values
title: 오류도 값이다
level: basic
relatedSkills: [explicit-failure]
furtherReading:
  - text: 'Joe Armstrong, "Making reliable distributed systems in the presence of software errors", PhD thesis, KTH Royal Institute of Technology, 2003'
    verified: false
---
Gleam에는 예상 가능한 실패를 위한 예외가 없다. 실패할 수 있는 함수는 `Result(a, e)`를 돌려주고, 실패는 `Error(e)`라는 **평범한 값**이 된다. 이 선택에서 세 가지 이점이 나온다.

- **시그니처가 정직하다**: 반환 타입만 보고 이 함수가 실패할 수 있는지, 어떤 식으로 실패하는지 안다.
- **처리를 잊을 수 없다**: `Result(Int, e)` 안의 `Int`를 쓰려면 `case`나 `result` 모듈 함수로 꺼내야 한다. 실패 경로를 무시하면 타입이 맞지 않는다.
- **오류를 다룰 수 있다**: 값이므로 비교하고, 패턴 매칭하고, 목록에 모으고, 테스트에서 `should.equal`로 검사할 수 있다.

## 오류 타입 설계

오류 값이 쓸모 있으려면 호출하는 쪽이 **분기할 수 있는** 모양이어야 한다. 실패 이유마다 생성자를 하나씩 둔 합 타입이 기본이다.

```gleam
import gleam/int

pub type QuantityError {
  NotANumber(input: String)
  NotPositive(value: Int)
}

pub fn parse_quantity(input: String) -> Result(Int, QuantityError) {
  case int.parse(input) {
    Error(Nil) -> Error(NotANumber(input))
    Ok(n) if n <= 0 -> Error(NotPositive(n))
    Ok(n) -> Ok(n)
  }
}
```

호출하는 쪽은 이유마다 다르게 반응할 수 있고, 컴파일러는 모든 생성자를 다뤘는지 검사한다.

```gleam
pub fn message(input: String) -> String {
  case parse_quantity(input) {
    Ok(n) -> int.to_string(n) <> "개를 담았습니다"
    Error(NotANumber(_)) -> "숫자를 입력하세요"
    Error(NotPositive(_)) -> "1 이상을 입력하세요"
  }
}
```

실패 이유가 하나뿐이면 `Result(a, Nil)`로 충분하다(`int.parse`, `list.first`). 이유가 여럿인데 `Nil`이나 `String`으로 뭉치면 정보가 사라진다. `String` 오류는 사람이 읽기에는 좋지만 호출하는 쪽이 문자열 비교로 분기해야 하므로 깨지기 쉽다. 문구는 가장 바깥에서 오류 값을 보고 만든다.

## 흔한 실수

- `result.unwrap(r, 0)`처럼 오류를 기본값으로 바꿔 삼키기. 실패했다는 사실이 사라지고, 0이 정상 결과처럼 흘러간다.
- 이유가 다른 실패를 같은 생성자로 돌려주기. 테스트는 `Error(NotPositive(0))`처럼 **어떤** 오류인지까지 확인한다.
- 예상 가능한 입력 오류에 `panic`이나 `let assert` 쓰기.

BEAM의 "let it crash" 철학은 이와 충돌하지 않는다. 그것은 버그나 예상하지 못한 상태에서 프로세스를 재시작하는 전략이다. 사용자가 잘못 입력한 수량은 예상된 결과이므로 값으로 돌려준다.

## 이 개념이 쓰이는 곳

- 입력 파싱과 검증 함수의 반환 타입을 정할 때.
- 여러 단계의 실패를 하나의 오류 타입으로 모으고 `result.try`로 연결할 때(Result 연결과 모나드 참고).
- 오류 종류별로 다른 메시지나 HTTP 상태를 만들 때.
