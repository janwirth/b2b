Feature: Press Keys

Scenario: Press Enter in search input
    When I open localhost:3000
    Then I see "Hello World"
    And I type "BDD Testing" into "search-input"
    When I press "Enter" in "search-input"
    Then I see "Search for: BDD Testing"
