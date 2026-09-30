import gleam/list

pub type Patient {
  Patient(name: String, severity: Int, arrival: Int)
}

/// 환자를 담는 레프티스트 힙. 가장 먼저 진료할 환자가 루트에 있다.
pub type Queue {
  Empty
  Node(rank: Int, patient: Patient, left: Queue, right: Queue)
}

/// a를 b보다 먼저 진료해야 하면 True.
/// 중증도가 높을수록 먼저, 같으면 먼저 도착한 환자가 먼저다.
pub fn goes_first(a: Patient, b: Patient) -> Bool {
  case a.severity == b.severity {
    True -> a.arrival < b.arrival
    False -> a.severity > b.severity
  }
}

pub fn merge(a: Queue, b: Queue) -> Queue {
  case a, b {
    Empty, queue | queue, Empty -> queue
    Node(patient: p, left: left_a, right: right_a, ..), Node(patient: q, ..) ->
      case goes_first(p, q) {
        True -> make(p, left_a, merge(right_a, b))
        False -> merge(b, a)
      }
  }
}

pub fn treatment_order(patients: List(Patient)) -> List(String) {
  patients
  |> list.fold(Empty, add)
  |> drain([])
}

fn drain(queue: Queue, names: List(String)) -> List(String) {
  case next(queue) {
    Ok(#(patient, rest)) -> drain(rest, [patient.name, ..names])
    Error(Nil) -> list.reverse(names)
  }
}

// ---- 아래는 주어진 코드 ----

pub fn rank(queue: Queue) -> Int {
  case queue {
    Empty -> 0
    Node(rank:, ..) -> rank
  }
}

pub fn make(patient: Patient, a: Queue, b: Queue) -> Queue {
  case rank(a) >= rank(b) {
    True -> Node(rank(b) + 1, patient, a, b)
    False -> Node(rank(a) + 1, patient, b, a)
  }
}

pub fn add(queue: Queue, patient: Patient) -> Queue {
  merge(queue, Node(1, patient, Empty, Empty))
}

/// 가장 먼저 진료할 환자와 나머지 대기열.
pub fn next(queue: Queue) -> Result(#(Patient, Queue), Nil) {
  case queue {
    Empty -> Error(Nil)
    Node(patient:, left:, right:, ..) -> Ok(#(patient, merge(left, right)))
  }
}
