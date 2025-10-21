Feature: Read

Scenario: Basic
    When I open localhost:3000
    Then I see "Hello World"
    And I do not see "Wassup"
