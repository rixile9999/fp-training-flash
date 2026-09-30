검색창의 오타 교정은 두 단어가 얼마나 비슷한지를 **편집 거리**로 잽니다. `from`을 `to`로 바꾸는 데 필요한 편집의 최소 횟수를 구하세요.

```gleam
pub fn distance(from source: String, to target: String) -> Int
```

- 편집은 세 가지이고 각각 1회로 센다: 글자 하나 **삽입**, 글자 하나 **삭제**, 글자 하나를 다른 글자로 **바꾸기**.
- 글자는 grapheme 단위로 센다. 한글 한 글자도 한 글자다.
- 한쪽이 빈 문자열이면 거리는 다른 쪽의 글자 수다.
- 300글자 문자열끼리도 시간 제한 안에 끝나야 한다.

```gleam
distance(from: "parcel", to: "pencil")
// -> 3 (a→e, r→n, e→i 세 번 바꾸기)
```
