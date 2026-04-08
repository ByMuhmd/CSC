import React, { useState } from 'react';
import { Shield, FileText } from 'lucide-react';

export default function Compliance() {
    const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');

    return (
        <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none" aria-hidden="true">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-4xl w-full py-12">
                <div className="mb-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className={`p-4 ${activeTab === 'privacy' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-purple-500/10 border-purple-500/20'} rounded-full border transition-all`}>
                            {activeTab === 'privacy' ? (
                                <Shield className="w-12 h-12 text-blue-500" />
                            ) : (
                                <FileText className="w-12 h-12 text-purple-500" />
                            )}
                        </div>
                    </div>
                    <h1 className={`text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text transition-all ${
                        activeTab === 'privacy'
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                            : 'bg-gradient-to-r from-purple-500 to-blue-500'
                    } mb-2`}>
                        {activeTab === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                    </h1>
                    <p className="text-gray-400">Last updated: January 2, 2026</p>
                </div>

                <div className="flex gap-4 mb-8 justify-center">
                    <button
                        onClick={() => setActiveTab('privacy')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                            activeTab === 'privacy'
                                ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                                : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                    >
                        <Shield size={18} />
                        Privacy Policy
                    </button>
                    <button
                        onClick={() => setActiveTab('terms')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                            activeTab === 'terms'
                                ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                                : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                    >
                        <FileText size={18} />
                        Terms of Service
                    </button>
                </div>

                <div className="space-y-8 text-gray-300 bg-gray-900/50 rounded-2xl border border-gray-800 p-8 animate-in fade-in duration-300">
                    {activeTab === 'privacy' ? (
                        <>
                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
                                <p className="leading-relaxed">
                                    Welcome to CS Cohort '23 ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our educational platform.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
                                <p className="leading-relaxed mb-3">We may collect the following types of information:</p>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li>Usage data (pages visited, time spent, interactions)</li>
                                    <li>Device information (browser type, operating system)</li>
                                    <li>Feedback and communications you provide through our forms</li>
                                    <li>Any information you voluntarily provide when using our services</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
                                <p className="leading-relaxed mb-3">We use the collected information to:</p>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li>Provide and improve our educational services</li>
                                    <li>Respond to your feedback and inquiries</li>
                                    <li>Analyze usage patterns to enhance user experience</li>
                                    <li>Maintain the security and integrity of our platform</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">4. Data Sharing and Disclosure</h2>
                                <p className="leading-relaxed">
                                    We do not sell, trade, or rent your personal information to third parties. We may share information only in the following circumstances:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                                    <li>With your explicit consent</li>
                                    <li>To comply with legal obligations</li>
                                    <li>To protect our rights and the safety of our users</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">5. Data Security</h2>
                                <p className="leading-relaxed">
                                    We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">6. Cookies and Tracking</h2>
                                <p className="leading-relaxed">
                                    We may use cookies and similar tracking technologies to enhance your experience on our platform. You can control cookie settings through your browser preferences.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">7. Third-Party Links</h2>
                                <p className="leading-relaxed">
                                    Our platform may contain links to third-party websites (such as YouTube, Telegram, and Google Drive). We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">8. Children's Privacy</h2>
                                <p className="leading-relaxed">
                                    Our service is intended for educational purposes and may be used by students of various ages. We do not knowingly collect personal information from children under 13 without parental consent.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">9. Your Rights</h2>
                                <p className="leading-relaxed mb-3">You have the right to:</p>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li>Access the personal information we hold about you</li>
                                    <li>Request correction of inaccurate information</li>
                                    <li>Request deletion of your personal information</li>
                                    <li>Object to processing of your personal information</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">10. Changes to This Policy</h2>
                                <p className="leading-relaxed">
                                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">11. Contact Us</h2>
                                <p className="leading-relaxed">
                                    If you have any questions about this Privacy Policy or our data practices, please contact us through our feedback form or via our Telegram channel.
                                </p>
                            </section>
                        </>
                    ) : (
                        <>
                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                                <p className="leading-relaxed">
                                    By accessing and using CS Cohort '23 ("the Platform"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
                                <p className="leading-relaxed">
                                    CS Cohort '23 is an educational platform providing study materials, quizzes, and resources for computer science students. We reserve the right to modify, suspend, or discontinue any part of the service at any time without notice.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">3. User Responsibilities</h2>
                                <p className="leading-relaxed mb-3">As a user of this platform, you agree to:</p>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li>Use the service for lawful and educational purposes only</li>
                                    <li>Not attempt to gain unauthorized access to any part of the platform</li>
                                    <li>Not interfere with or disrupt the service or servers</li>
                                    <li>Not transmit any harmful code, viruses, or malicious software</li>
                                    <li>Respect intellectual property rights of content on the platform</li>
                                    <li>Provide accurate information when submitting feedback or using forms</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">4. Intellectual Property</h2>
                                <p className="leading-relaxed">
                                    All content on this platform, including but not limited to text, graphics, logos, images, and software, is the property of CS Cohort '23 or its content suppliers and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without explicit permission.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">5. Educational Use</h2>
                                <p className="leading-relaxed">
                                    The materials and resources provided on this platform are intended for educational purposes. While we strive for accuracy, we make no guarantees about the completeness or accuracy of the content. Users are responsible for verifying information from additional sources.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">6. User-Generated Content</h2>
                                <p className="leading-relaxed">
                                    If you submit feedback, comments, or other content to the platform, you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, and display such content for the purpose of operating and improving our service.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">7. Third-Party Links and Services</h2>
                                <p className="leading-relaxed">
                                    Our platform may contain links to third-party websites or services (including YouTube, Telegram, and Google Drive) that are not owned or controlled by us. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">8. Disclaimer of Warranties</h2>
                                <p className="leading-relaxed">
                                    The service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the service will be uninterrupted, secure, or error-free.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">9. Limitation of Liability</h2>
                                <p className="leading-relaxed">
                                    To the maximum extent permitted by law, CS Cohort '23 shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the service.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">10. Indemnification</h2>
                                <p className="leading-relaxed">
                                    You agree to indemnify and hold harmless CS Cohort '23 and its affiliates from any claims, damages, losses, or expenses arising from your use of the service or violation of these terms.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">11. Modifications to Terms</h2>
                                <p className="leading-relaxed">
                                    We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting. Your continued use of the platform after changes are posted constitutes acceptance of the modified terms.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">12. Termination</h2>
                                <p className="leading-relaxed">
                                    We reserve the right to terminate or suspend access to our service immediately, without prior notice, for any reason, including breach of these Terms of Service.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">13. Governing Law</h2>
                                <p className="leading-relaxed">
                                    These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law provisions.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-white mb-4">14. Contact Information</h2>
                                <p className="leading-relaxed">
                                    If you have any questions about these Terms of Service, please contact us through our feedback form or via our Telegram channel.
                                </p>
                            </section>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
