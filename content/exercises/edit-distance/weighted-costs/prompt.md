스캔한 송장을 글자 인식(OCR)으로 읽으면 글자가 빠지는 일은 흔하지만, 엉뚱한 글자로 바뀌는 일은 드뭅니다. 그래서 주소 교정 모듈은 편집 종류마다 비용을 다르게 줍니다. `from`을 `to`로 바꾸는 최소 **비용**을 구하세요.

```gleam
pub type Costs {
  Costs(insert: Int, delete: Int, substitute: Int)
}

pub fn distance_with(from source: String, to target: String, costs costs: Costs) -> Int
```

- **삽입**: `from`에 글자 하나를 넣는다. 비용 `costs.insert`.
- **삭제**: `from`에서 글자 하나를 뺀다. 비용 `costs.delete`.
- **바꾸기**: `from`의 글자 하나를 다른 글자로 바꾼다. 비용 `costs.substitute`. 같은 글자끼리는 비용 0으로 그대로 둔다.
- 비용은 모두 양의 정수다. 글자는 grapheme 단위로 센다.
- 200글자 문자열끼리도 시간 제한 안에 끝나야 한다.

```gleam
distance_with(from: "cat", to: "cut", costs: Costs(insert: 1, delete: 1, substitute: 5))
// -> 2 ("a"를 바꾸는 5보다 "a" 삭제 1 + "u" 삽입 1이 싸다)
```
