import gleam/list

pub type Patient {
  Patient(name: String, severity: Int, arrival: Int)
}

/// A leftist heap of patients. The patient to be treated first is at the root.
pub type Queue {
  Empty
  Node(rank: Int, patient: Patient, left: Queue, right: Queue)
}

/// True if a must be treated before b.
/// Higher severity goes first; if equal, the patient who arrived first goes first.
pub fn goes_first(a: Patient, b: Patient) -> Bool {
  todo
}

pub fn merge(a: Queue, b: Queue) -> Queue {
  todo
}

pub fn treatment_order(patients: List(Patient)) -> List(String) {
  todo
}

// ---- Code below is provided ----

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

/// The patient to be treated first and the rest of the queue.
pub fn next(queue: Queue) -> Result(#(Patient, Queue), Nil) {
  case queue {
    Empty -> Error(Nil)
    Node(patient:, left:, right:, ..) -> Ok(#(patient, merge(left, right)))
  }
}
