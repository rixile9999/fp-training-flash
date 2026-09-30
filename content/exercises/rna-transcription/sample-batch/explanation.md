시료 묶음 전체는 "모든 시료가 성공해야 성공, 아니면 첫 실패"입니다. 베이스 문제에서 글자 목록에 쓴 `list.try_map`을 이번에는 시료 목록에 한 단계 위에서 다시 쓰면 됩니다.

```gleam
list.try_map(samples, transcribe_sample)

fn transcribe_sample(sample: Sample) -> Result(#(String, String), String) {
  to_rna(sample.dna)
  |> result.map(fn(rna) { #(sample.id, rna) })
  |> result.replace_error(sample.id)
}
```

`to_rna`의 오류는 `Nil`이라서 "어느 시료가 틀렸는지" 모릅니다. 그 정보를 아는 것은 시료를 들고 있는 바깥 함수이므로, 바깥에서 `result.replace_error(sample.id)`로 오류를 더 쓸모 있는 값으로 바꿉니다. 성공 값도 `result.map`으로 `#(id, rna)` 쌍으로 바꿉니다. 이렇게 시료 하나를 처리하는 함수를 따로 두면 `try_map`에 넘기는 부분이 한 줄로 끝나고, 시료 하나의 규칙을 따로 확인할 수 있습니다.

흔한 실수는 두 가지입니다.

- `list.filter_map`으로 성공한 시료만 모으는 것. 잘못된 시료가 결과에서 조용히 빠지고, 호출한 쪽은 시료가 사라진 줄 모릅니다.
- `list.fold`로 직접 누적하면서 실패할 때마다 `Error(sample.id)`로 덮어쓰는 것. 이러면 마지막으로 실패한 시료가 보고됩니다. `try_map`은 첫 실패에서 멈추므로 이런 실수가 생길 여지가 없습니다.

작은 `Result` 함수를 모아 큰 `Result` 함수를 만드는 방식은 이론 노트 "오류도 값이다"(errors-as-values)에서 더 다룹니다.
