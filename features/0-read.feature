Feature: Read

Scenario: Basic
    When I open localhost:3000
    Then I see "Hello World"
    And I do not see "Wassup"
    # check title
    And I do not see "Test Page"
    And the tab reads "Hello World Test Page"

@shouldFail
Scenario: Should fail
    When I open localhost:3000
    Then I see "I SHOULD NOT BE HERE"
