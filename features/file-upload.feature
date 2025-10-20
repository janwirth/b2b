Feature: File Upload
  As a user
  I want to upload files to a web page
  So that I can test file upload functionality

  Scenario: Upload CV file
    When I open localhost:3000
    Then I see "Hello World"
    And when I upload "example-cv-jan-wirth.pdf"
    Then I see "File uploaded successfully"
