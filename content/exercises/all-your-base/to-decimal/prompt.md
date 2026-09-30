진법 변환의 첫 단계입니다. `base` 진법의 자릿수 목록을 받아 그 수의 값을 반환하는 `from_digits`를 구현하세요.

```gleam
pub type RebaseError {
  InvalidBase(Int)
  InvalidDigit(Int)
}

pub fn from_digits(digits: List(Int), base: Int) -> Result(Int, RebaseError)
```

- `digits`는 높은 자리부터 적혀 있다. 빈 목록의 값은 0이다.
- 변환은 직접 구현한다(`int.undigits`를 쓰지 않는다).
- `base`가 2보다 작으면 자릿수를 보지 않고 `Error(InvalidBase(base))`를 반환한다.
- 자릿수가 0보다 작거나 `base` 이상이면 `Error(InvalidDigit(그 자릿수))`를 반환한다. 잘못된 자릿수가 여럿이면 가장 앞의 것을 알린다.

```gleam
from_digits([1, 0, 1], 2)  // -> Ok(5)
from_digits([1, 2, 1], 2)  // -> Error(InvalidDigit(2))
```
