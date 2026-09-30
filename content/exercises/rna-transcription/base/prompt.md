DNA 가닥을 받아 전사된 RNA 가닥을 돌려주는 `to_rna(dna: String) -> Result(String, Nil)`을 구현하세요.

DNA 가닥은 대문자 `G`, `C`, `T`, `A`로 이루어진 문자열입니다. 각 염기를 다음 짝으로 바꾸면 RNA가 됩니다.

| DNA | RNA |
|---|---|
| `G` | `C` |
| `C` | `G` |
| `T` | `A` |
| `A` | `U` |

- 결과는 입력과 같은 순서로 이어 붙인 문자열을 `Ok`로 감싼다. 빈 문자열은 `Ok("")`이다.
- 위 네 대문자가 아닌 글자(소문자, 공백, `U` 등)가 하나라도 있으면 `Error(Nil)`을 반환한다.

```gleam
to_rna("ACGT")  // -> Ok("UGCA")
to_rna("ACXT")  // -> Error(Nil)
```
