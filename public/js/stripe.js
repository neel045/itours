import axios from 'axios';
import { showAlert } from './alert';

export const bookTour = async tourId => {
  try {
    const stripe = Stripe(
      'pk_test_51I2amPJVKdSGPgoYuy9LZbRLoMUubioFDHkK4VJ90Mt24P0dqtV3vfniM07NPpbgPSWjADbZ54Zvu1uFS3WqF24300x2A5ckP6'
    );
    // 1)Get the session from API
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(session);
    //   2) Create a checkout form and charge the userDataForm
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (error) {
    console.log(error);
    showAlert('error', error);
  }
};
