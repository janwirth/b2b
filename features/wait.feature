Feature: Wait
  As a user
  I want to wait for a specified amount of time
  So that I can test timing-related functionality

  Scenario: Wait for 2 seconds
    When I open localhost:3000
    Then I see "Hello World"
    And I wait 2 seconds
    Then I see "Hello World"

  Scenario: Wait for 1 second
    When I open localhost:3000
    Then I see "Hello World"
    And I wait 1 seconds
    Then I see "Hello World"
