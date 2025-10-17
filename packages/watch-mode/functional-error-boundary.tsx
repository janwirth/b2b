import React from "react";
import { Text } from "ink";

type ErrorHandler = (error: Error, info: React.ErrorInfo) => void;
type ErrorHandlingComponent<Props> = (
  props: Props,
  error?: Error,
) => React.ReactNode;

type ErrorState = { error?: Error };

export default function Catch<Props extends {}>(
  component: ErrorHandlingComponent<Props>,
  errorHandler?: ErrorHandler,
): React.ComponentType<Props> {
  return class extends React.Component<Props, ErrorState> {
    state: ErrorState = {
      error: undefined,
    };

    static getDerivedStateFromError(error: Error) {
      return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
      if (errorHandler) {
        errorHandler(error, info);
      }
    }

    render() {
      return component(this.props, this.state.error);
    }
  };
}

type Props = {
  children: React.ReactNode;
};

export const ErrorBoundary = Catch(function MyErrorBoundary(
  props: Props,
  error?: Error,
) {
  if (error) {
    return (
      <Text>
        ERR {error.message}
        {error.stack}
      </Text>
    );
  } else {
    return <React.Fragment>{props.children}</React.Fragment>;
  }
});
