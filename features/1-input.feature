Feature: Input
  As a user
  I want to interact with a simple web page
  So that I can verify basic functionality

  Scenario: Simple Click
    When I open localhost:3000
    Then I see "Hello World"
    And when I click "Press me"
    Then I see "The sun is shining"

  Scenario: Text input
    When I open localhost:3000
    Then I see "Hello World"
    # textarea or input with aria-label "example-input"
    And when I type "My new text" into "example-input"
    Then I find "My new text" in "example-input
