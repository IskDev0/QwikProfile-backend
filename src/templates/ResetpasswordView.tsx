import { FC } from "hono/jsx";

const resetLink = process.env.FRONTEND_URL + "/auth/reset-password";

const ResetPasswordView: FC = (props) => {
  return (
    <html>
      <body>
        <h1>Reset Password</h1>
        <button>
          <a href={resetLink + props.resetToken}>Set up new password</a>
        </button>
      </body>
    </html>
  );
};

export default ResetPasswordView;
