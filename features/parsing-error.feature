Feature: Parsing Error Example

Scenario: Login
    When I open localhost:3000
    And I type pass into password
    Then I see "CV Ranking System"
    And I click on CV Management
    Then I see Upload CV Documents
