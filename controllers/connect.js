const { sendEmail } = require("../middlewares/sendEmail");

exports.hiringForm = async (req, res) => {
  try {
      const { name, email, number, resumeLink, linkedProfileLink } = req.body;
      if (!name || !email || !resumeLink) {
        return res.status(400).json({ success: false, message: "All fields are required." });
      }

      // let attachments = [];
      // if (req.file) {
      //   attachments.push({
      //     filename: req.file.originalname,
      //     content: req.file.buffer, // Directly using file buffer from memory
      //   });
      // }

      await sendEmail({
        email: "contact.medhwan@gmail.com",
        subject: "New Hiring Form Submission",
        html: `<h3>New Job Application</h3>
               <p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Mobile Number:</strong> ${number}</p>
               <p><strong>Resume Link:</strong> ${resumeLink}</p>
               <p><strong>LinkedIn Profile Link:</strong> ${linkedProfileLink}</p>`,
        // attachments: attachments
      });
      
      res.status(200).json({ success: true, message: "Email sent successfully." });
    } catch (error) {
      res.status(500).json({ success: false, message: "Something went wrong.", error });
    }
};
