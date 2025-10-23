@skip
Feature: Parsing Error Example
    # This feature is an example of a parsing error

Scenario: Login
    When I open localhost:3000
    And I type pass into password
    Then I see "CV Ranking System
    And I click CV Management
