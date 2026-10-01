import gleam/list

pub type Patient {
  Patient(name: String, severity: Int, arrival: Int)
}

/// 存放患者的左偏堆。最先就诊的患者位于根节点。
pub type Queue {
  Empty
  Node(rank: Int, patient: Patient, left: Queue, right: Queue)
}

/// 如果 a 应先于 b 就诊，返回 True。
/// 病情越重越优先；相同时，先到的患者优先。
pub fn goes_first(a: Patient, b: Patient) -> Bool {
  todo
}

pub fn merge(a: Queue, b: Queue) -> Queue {
  todo
}

pub fn treatment_order(patients: List(Patient)) -> List(String) {
  todo
}

// ---- 以下为已提供的代码 ----

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

/// 最先就诊的患者，以及剩余的候诊队列。
pub fn next(queue: Queue) -> Result(#(Patient, Queue), Nil) {
  case queue {
    Empty -> Error(Nil)
    Node(patient:, left:, right:, ..) -> Ok(#(patient, merge(left, right)))
  }
}
