import gleeunit/should
import high_school_sweetheart.{first_letter, initial, initials, pair}

pub fn first_letter_test() {
  first_letter("Mary")
  |> should.equal("M")
}

pub fn first_letter_keeps_case_test() {
  first_letter("john")
  |> should.equal("j")
}

pub fn first_letter_trims_whitespace_test() {
  first_letter("\n\t   Sarah   ")
  |> should.equal("S")
}

pub fn first_letter_empty_test() {
  first_letter("   ")
  |> should.equal("")
}

pub fn initial_test() {
  initial("Betty")
  |> should.equal("B.")
}

pub fn initial_uppercases_test() {
  initial("james")
  |> should.equal("J.")
}

pub fn initials_test() {
  initials("Linda Miller")
  |> should.equal("L. M.")
}

pub fn pair_test() {
  pair("Avery Bryant", "Charlie Dixon")
  |> should.equal(
    "
     ******       ******
   **      **   **      **
 **         ** **         **
**            *            **
**                         **
**     A. B.  +  C. D.     **
 **                       **
   **                   **
     **               **
       **           **
         **       **
           **   **
             ***
              *
",
  )
}
