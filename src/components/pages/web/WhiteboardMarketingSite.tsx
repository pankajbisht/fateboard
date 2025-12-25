import React from 'react';
import Brand from '../../atoms/Brand';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../../lib/utils/usePageTitle';

function ImageSlider({ images }: { images: string[] }) {
    const [index, setIndex] = React.useState(0);

    React.useEffect(() => {
        const id = setInterval(() => {
            setIndex((i) => (i + 1) % images.length);
        }, 2500);
        return () => clearInterval(id);
    }, [images.length]);

    return (
        <div className="relative bg-white rounded-2xl shadow overflow-hidden">
            <img
                src={images[index]}
                alt="Fateboard glimpse"
                className="w-full h-64 object-cover transition-all"
            />

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, i) => (
                    <span
                        key={i}
                        className={`h-2 w-2 rounded-full ${i === index ? 'bg-blue-600' : 'bg-gray-300'}`}
                    />
                ))}
            </div>
        </div>
    );
}

export default function WhiteboardMarketingSite() {
    usePageTitle('Online Whiteboard | Fateboard');
    const navigate = useNavigate();

    const handleStartDrawing = () => {
        navigate('/draw');
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Brand src="fate.svg" className="h-10 cursor-pointer" />
                    <nav className="space-x-6 text-sm">
                        <a href="#features" className="hover:text-blue-600">
                            Features
                        </a>
                        <a href="#process" className="hover:text-blue-600">
                            Action
                        </a>
                        {/*<a href="#contact" className="hover:text-blue-600">Contact</a>*/}
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                <div className="max-w-6xl mx-auto px-6 py-24 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Draw the Fate</h2>
                    <p className="max-w-2xl mx-auto text-lg mb-8 opacity-90">
                        Just start with a blank canvas and the freedom to move the draw fate.
                    </p>
                    <button
                        className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold shadow hover:scale-105 transition"
                        onClick={handleStartDrawing}
                    >
                        Start Now
                    </button>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="py-20">
                <div className="max-w-6xl mx-auto px-6">
                    <h3 className="text-3xl font-bold text-center mb-12">Key Features</h3>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                title: 'Shape Creation',
                                desc: 'Draw rectangles, circles, arrows, and freehand shapes just like on a real whiteboard.',
                            },
                            {
                                title: 'Easy to Use',
                                desc: 'No learning curve. Pick a tool, draw, and your idea comes to life instantly.',
                            },
                            {
                                title: 'Color Options',
                                desc: 'Choose colors that feel right – soft, bold, or playful – to match your story.',
                            },
                        ].map((item) => (
                            <div
                                key={item.title}
                                className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition"
                            >
                                <h4 className="text-xl font-semibold mb-3">{item.title}</h4>
                                <p className="text-sm text-gray-600">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Process */}
            {/*<section id="process" className="bg-gray-100 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-3xl font-bold text-center mb-12">Our Process</h3>
          <div className="grid md:grid-cols-4 gap-6 text-center">
            {["Script", "Storyboard", "Animate", "Launch"].map((step, i) => (
              <div key={step} className="bg-white p-6 rounded-xl shadow">
                <div className="text-2xl font-bold text-blue-600 mb-2">{i + 1}</div>
                <div className="font-semibold">{step}</div>
              </div>
            ))}
          </div>
        </div>
      </section>*/}

            {/* See It In Action */}
            <section id="process" className="bg-gray-100 py-20">
                <div className="max-w-6xl mx-auto px-6">
                    <h3 className="text-3xl font-bold text-center mb-6">See It In Action</h3>
                    <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
                        A quick look at how ideas turn into visuals — simple, smooth, and human.
                    </p>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        {/* Description */}
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xl font-semibold mb-2">Draw Naturally</h4>
                                <p className="text-sm text-gray-600">
                                    Pick a shape or pen and draw freely, just like on a real
                                    whiteboard.
                                </p>
                            </div>
                            <div>
                                <h4 className="text-xl font-semibold mb-2">Adjust as You Go</h4>
                                <p className="text-sm text-gray-600">
                                    Resize, recolor, and tweak elements until it feels right.
                                </p>
                            </div>
                            <div>
                                <h4 className="text-xl font-semibold mb-2">Bring It to Life</h4>
                                <p className="text-sm text-gray-600">
                                    Watch your board come alive with smooth visual flow.
                                </p>
                            </div>
                        </div>

                        {/* Image Slider */}
                        <ImageSlider
                            images={['./demo.png', './shape.png', './draw.png', './text.png']}
                        />
                    </div>
                </div>
            </section>

            {/* CTA */}
            {/*<section id="contact" className="py-24 text-center">
        <h3 className="text-3xl font-bold mb-4">Ready to Grow Your Brand?</h3>
        <p className="text-gray-600 mb-8">
          Let’s create a whiteboard video that explains and sells.
        </p>
        <button className="bg-blue-600 text-white px-10 py-4 rounded-xl font-semibold shadow hover:bg-blue-700 transition">
          Contact Us
        </button>
      </section>*/}

            {/* Footer */}
            <footer className="bg-white border-t">
                <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-center text-gray-500">
                    © {new Date().getFullYear()} fateboard. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
