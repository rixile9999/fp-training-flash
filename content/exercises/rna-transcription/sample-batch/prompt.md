실험실에서 여러 시료의 DNA를 한 번에 전사하려고 합니다. 시료 하나를 전사하는 `to_rna(dna: String) -> Result(String, Nil)`은 이미 구현되어 있습니다(베이스 문제와 같은 규칙). 이 함수를 이용해 `transcribe_samples`를 구현하세요.

```gleam
pub type Sample {
  Sample(id: String, dna: String)
}

pub fn transcribe_samples(
  samples: List(Sample),
) -> Result(List(#(String, String)), String)
```

- 모든 시료의 DNA가 올바르면 `#(시료 id, RNA)` 쌍의 목록을 입력과 같은 순서로 `Ok`에 담아 반환한다. 시료가 없으면 `Ok([])`이다.
- DNA가 빈 문자열인 시료도 올바른 시료다(`to_rna("")`는 `Ok("")`).
- `to_rna`가 실패하는 시료가 있으면 그 시료의 `id`를 `Error`로 반환한다. 여럿이면 목록에서 가장 앞의 시료 `id`를 반환한다.

```gleam
transcribe_samples([Sample("S1", "ACGT"), Sample("S2", "GG")])
// -> Ok([#("S1", "UGCA"), #("S2", "CC")])

transcribe_samples([Sample("S1", "ACGT"), Sample("S2", "GXG")])
// -> Error("S2")
```
