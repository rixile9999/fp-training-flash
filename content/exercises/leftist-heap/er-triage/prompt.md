응급실 대기열을 레프티스트 힙으로 관리합니다. 환자는 이름, 중증도(`severity`, 클수록 위급), 도착 순번(`arrival`, 작을수록 먼저 옴)을 가집니다.

```gleam
pub type Patient {
  Patient(name: String, severity: Int, arrival: Int)
}
```

진료 규칙: 중증도가 높은 환자가 먼저다. 중증도가 같으면 먼저 도착한 환자가 먼저다. 도착 순번은 환자마다 다르다.

힙 타입 `Queue`와 `rank`, `make`(rank가 큰 자식을 왼쪽에 두는 노드 생성), `add`, `next`는 이미 있습니다. 다음 세 함수를 구현하세요.

- `goes_first(a, b)`: 규칙상 `a`를 `b`보다 먼저 진료해야 하면 `True`.
- `merge(a, b)`: 두 대기열을 합친 레프티스트 힙. 루트에는 `goes_first` 기준으로 가장 먼저 진료할 환자가 온다. 노드는 `make`로 만든다.
- `treatment_order(patients)`: 모든 환자를 대기열에 넣은 뒤 진료 순서대로 이름 목록을 돌려준다.

```gleam
treatment_order([Patient("김", 2, 1), Patient("이", 5, 2), Patient("박", 5, 3)])
// -> ["이", "박", "김"]   이와 박은 중증도가 같아 먼저 온 이가 앞선다
```
