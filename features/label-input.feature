@focus
Feature: Label Input Patterns
  As a user
  I want to interact with input elements that are associated with labels
  So that I can verify different label-input markup patterns work

  Scenario: Input inside label tag
    When I open localhost:3000
    Then I see "Hello World"
    And when I type "Input Inside Label" into "Nested Label Input"
    Then I find "Input Inside Label" in "Nested Label Input"

  Scenario: Input next to label tag
    When I open localhost:3000
    Then I see "Hello World"
    And when I type "Input Next Label" into "Adjacent Label Input"
    Then I find "Input Next Label" in "Adjacent Label Input"

  Scenario: Label with for attribute
    When I open localhost:3000
    Then I see "Hello World"
    And when I type "Linked Input Text" into "Linked Label Input"
    Then I find "Linked Input Text" in "Linked Label Input"
