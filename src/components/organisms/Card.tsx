import type React from 'react';
import CardBody from '../molecules/CardBody';
import CardFooter from '../molecules/CardFooter';
import CardHeader from '../molecules/CardHeader';

type CardProp = {
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
};

function Card({ title, children, footer }: CardProp) {
    return (
        <div
            className="
        my-8 w-full max-w-3xl
        rounded-xl border border-gray-200
        bg-white
        shadow-sm hover:shadow-md
        transition-shadow duration-200
      "
        >
            {title && (
                <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                    <CardHeader title={title} />
                </div>
            )}

            <div className="px-5 py-4">
                <CardBody>{children}</CardBody>
            </div>

            {footer && (
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                    <CardFooter>{footer}</CardFooter>
                </div>
            )}
        </div>
    );
}

export default Card;
